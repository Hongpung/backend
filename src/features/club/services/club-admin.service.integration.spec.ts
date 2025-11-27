import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { ClubAdminService } from './club-admin.service';
import { ClubMemberService } from './club-member.service';
import { ClubRepository } from '../repositories/club.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('ClubAdminService (통합)', () => {
  let prisma: PrismaClient;
  let service: ClubAdminService;

  let testClubId: number;
  let otherClubId: number;
  let memberId1: number;
  let memberId2: number;
  let otherClubMemberId: number;

  const email = (clubId: number, n: number) =>
    `club-admin-svc-int-${clubId}-m${n}@integration.test`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();

    const repository = new ClubRepository(prisma as unknown as PrismaService);
    const memberService = new ClubMemberService(repository);
    service = new ClubAdminService(memberService, repository);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 10_000;
    otherClubId = testClubId + 1;

    await prisma.club.createMany({
      data: [
        {
          clubId: testClubId,
          clubName: `통합테스트동아리-${testClubId}`,
          profileImageUrl: null,
        },
        {
          clubId: otherClubId,
          clubName: `통합테스트타동아리-${otherClubId}`,
          profileImageUrl: null,
        },
      ],
    });

    const m1 = await prisma.member.create({
      data: {
        email: email(testClubId, 1),
        password: 'pw',
        name: '통합멤버1',
        enrollmentNumber: `int-admin-${testClubId}-1`,
        clubId: testClubId,
      },
    });
    const m2 = await prisma.member.create({
      data: {
        email: email(testClubId, 2),
        password: 'pw',
        name: '통합멤버2',
        enrollmentNumber: `int-admin-${testClubId}-2`,
        clubId: testClubId,
      },
    });
    const other = await prisma.member.create({
      data: {
        email: email(otherClubId, 1),
        password: 'pw',
        name: '타동아리멤버',
        enrollmentNumber: `int-admin-${otherClubId}-1`,
        clubId: otherClubId,
      },
    });

    memberId1 = m1.memberId;
    memberId2 = m2.memberId;
    otherClubMemberId = other.memberId;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.clubPrimaryMember.deleteMany({
      where: { clubId: { in: [testClubId, otherClubId] } },
    });
    await prisma.roleAssignment.deleteMany({
      where: { clubId: { in: [testClubId, otherClubId] } },
    });
    await prisma.member.deleteMany({
      where: {
        memberId: { in: [memberId1, memberId2, otherClubMemberId] },
      },
    });
    await prisma.club.deleteMany({
      where: { clubId: { in: [testClubId, otherClubId] } },
    });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('updateClubPrimaryMembers', () => {
    it('유효한 멤버 ID면 clubPrimaryMember에 저장된다', async () => {
      await service.updateClubPrimaryMembers(testClubId, [memberId2, memberId1]);

      const rows = await prisma.clubPrimaryMember.findMany({
        where: { clubId: testClubId },
        orderBy: { memberId: 'asc' },
      });

      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.memberId)).toEqual(
        [memberId1, memberId2].sort((a, b) => a - b),
      );
    });

    it('빈 배열이면 BadRequestException이고 DB는 변경되지 않는다', async () => {
      await service.updateClubPrimaryMembers(testClubId, [memberId1]);

      const before = await prisma.clubPrimaryMember.findMany({
        where: { clubId: testClubId },
        orderBy: { memberId: 'asc' },
      });

      await expect(
        service.updateClubPrimaryMembers(testClubId, []),
      ).rejects.toBeInstanceOf(BadRequestException);

      const after = await prisma.clubPrimaryMember.findMany({
        where: { clubId: testClubId },
        orderBy: { memberId: 'asc' },
      });

      expect(after).toEqual(before);
    });

    it('동아리 소속이 아닌 멤버가 포함되면 BadRequestException이다', async () => {
      await expect(
        service.updateClubPrimaryMembers(testClubId, [
          memberId1,
          otherClubMemberId,
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);

      const rows = await prisma.clubPrimaryMember.findMany({
        where: { clubId: testClubId },
      });
      expect(rows.every((r) => r.memberId !== otherClubMemberId)).toBe(true);
    });

    it('존재하지 않는 동아리면 UnauthorizedException이다', async () => {
      await expect(
        service.updateClubPrimaryMembers(testClubId + 99_999, [memberId1]),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('중복 ID는 제거한 뒤 저장한다', async () => {
      await service.updateClubPrimaryMembers(testClubId, [
        memberId2,
        memberId1,
        memberId2,
      ]);

      const rows = await prisma.clubPrimaryMember.findMany({
        where: { clubId: testClubId },
        orderBy: { memberId: 'asc' },
      });

      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.memberId)).toEqual(
        [memberId1, memberId2].sort((a, b) => a - b),
      );
    });
  });

  describe('updateClubProfile', () => {
    beforeEach(async () => {
      await prisma.club.update({
        where: { clubId: testClubId },
        data: { profileImageUrl: null },
      });
      await prisma.roleAssignment.deleteMany({
        where: { clubId: testClubId },
      });
    });

    it('profileImageUrl만 전달하면 프로필만 갱신되고 역할은 변경되지 않는다', async () => {
      await prisma.roleAssignment.create({
        data: { clubId: testClubId, role: 'LEADER', memberId: memberId1 },
      });
      const url = 'https://cdn.test/profile-only.png';

      await service.updateClubProfile(testClubId, { profileImageUrl: url });

      const club = await prisma.club.findUnique({
        where: { clubId: testClubId },
        select: { profileImageUrl: true },
      });
      const roles = await prisma.roleAssignment.findMany({
        where: { clubId: testClubId },
      });

      expect(club?.profileImageUrl).toBe(url);
      expect(roles).toHaveLength(1);
      expect(roles[0].role).toBe('LEADER');
      expect(roles[0].memberId).toBe(memberId1);
    });

    it('roleAssignments만 전달하면 역할만 갱신되고 프로필 이미지는 변경되지 않는다', async () => {
      const existingUrl = 'https://cdn.test/existing.png';
      await prisma.club.update({
        where: { clubId: testClubId },
        data: { profileImageUrl: existingUrl },
      });

      await service.updateClubProfile(testClubId, {
        roleAssignments: [
          { role: '패짱', userId: memberId1 },
          { role: '상쇠', userId: memberId2 },
        ],
      });

      const club = await prisma.club.findUnique({
        where: { clubId: testClubId },
        select: { profileImageUrl: true },
      });
      const roles = await prisma.roleAssignment.findMany({
        where: { clubId: testClubId },
        orderBy: { role: 'asc' },
      });

      expect(club?.profileImageUrl).toBe(existingUrl);
      expect(roles).toHaveLength(2);
      expect(roles.map((r) => r.role).sort()).toEqual(['LEADER', 'SANGSOE']);
    });

    it('profileImageUrl와 roleAssignments를 함께 전달하면 둘 다 반영된다', async () => {
      const url = 'https://cdn.test/both.png';

      await service.updateClubProfile(testClubId, {
        profileImageUrl: url,
        roleAssignments: [{ role: '패짱', userId: memberId2 }],
      });

      const club = await prisma.club.findUnique({
        where: { clubId: testClubId },
        select: { profileImageUrl: true },
      });
      const roles = await prisma.roleAssignment.findMany({
        where: { clubId: testClubId },
      });

      expect(club?.profileImageUrl).toBe(url);
      expect(roles).toHaveLength(1);
      expect(roles[0].role).toBe('LEADER');
      expect(roles[0].memberId).toBe(memberId2);
    });

    it('profileImageUrl을 null로 전달하면 프로필 이미지가 삭제된다', async () => {
      await prisma.club.update({
        where: { clubId: testClubId },
        data: { profileImageUrl: 'https://cdn.test/to-clear.png' },
      });

      await service.updateClubProfile(testClubId, { profileImageUrl: null });

      const club = await prisma.club.findUnique({
        where: { clubId: testClubId },
        select: { profileImageUrl: true },
      });

      expect(club?.profileImageUrl).toBeNull();
    });

    it('roleAssignments에 userId가 null이면 해당 역할만 삭제된다', async () => {
      await service.updateClubProfile(testClubId, {
        roleAssignments: [
          { role: '패짱', userId: memberId1 },
          { role: '상쇠', userId: memberId2 },
        ],
      });

      await service.updateClubProfile(testClubId, {
        roleAssignments: [{ role: '상쇠', userId: null }],
      });

      const roles = await prisma.roleAssignment.findMany({
        where: { clubId: testClubId },
        orderBy: { role: 'asc' },
      });

      expect(roles).toHaveLength(1);
      expect(roles[0].role).toBe('LEADER');
      expect(roles[0].memberId).toBe(memberId1);
    });

    it('존재하지 않는 동아리면 UnauthorizedException이다', async () => {
      await expect(
        service.updateClubProfile(testClubId + 99_999, {
          profileImageUrl: 'https://cdn.test/nope.png',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
