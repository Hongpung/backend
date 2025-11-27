import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { IMemberRepository } from './ports/out/member.repository.port';
import type { IMemberAdminAuthPort } from './ports/out/member-admin-auth.port';
import { MemberProfileService } from './member-profile.service';
import { MemberPrismaRepository } from '../infrastructure/out/prisma/member.prisma.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('MemberProfileService (통합)', () => {
  let prisma: PrismaClient;
  let profileService: MemberProfileService;
  let memberAdminAuth: jest.Mocked<IMemberAdminAuthPort>;

  const runId = Date.now();
  let clubAId: number;
  let clubBId: number;
  let adminMemberId: number;
  let targetMemberId: number;
  let noClubMemberId: number;

  const targetEmail = `member-profile-target-${runId}@integration.test`;
  const adminEmail = `member-profile-admin-${runId}@integration.test`;
  const noClubEmail = `member-profile-noclub-${runId}@integration.test`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();

    memberAdminAuth = {
      verifyAdminPassword: jest.fn(async () => true),
    } as unknown as jest.Mocked<IMemberAdminAuthPort>;

    const repository = new MemberPrismaRepository(
      prisma as unknown as PrismaService,
    );
    profileService = new MemberProfileService(
      repository as unknown as IMemberRepository,
      memberAdminAuth,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    clubAId = (maxClub._max.clubId ?? 0) + 52_000;
    clubBId = clubAId + 1;

    await prisma.club.createMany({
      data: [
        {
          clubId: clubAId,
          clubName: `member-profile-club-a-${runId}`,
          profileImageUrl: null,
        },
        {
          clubId: clubBId,
          clubName: `member-profile-club-b-${runId}`,
          profileImageUrl: null,
        },
      ],
    });

    const admin = await prisma.member.create({
      data: {
        email: adminEmail,
        password: 'pw',
        name: '관리자',
        enrollmentNumber: `member-profile-admin-${runId}`,
        clubId: clubAId,
        isPermmited: 'ACCEPTED',
      },
    });
    adminMemberId = admin.memberId;

    const target = await prisma.member.create({
      data: {
        email: targetEmail,
        password: 'pw',
        name: '대상회원',
        nickname: '기존닉',
        enrollmentNumber: `member-profile-target-${runId}`,
        clubId: clubAId,
        isPermmited: 'ACCEPTED',
      },
    });
    targetMemberId = target.memberId;

    const noClub = await prisma.member.create({
      data: {
        email: noClubEmail,
        password: 'pw',
        name: '동아리없음',
        enrollmentNumber: `member-profile-noclub-${runId}`,
        clubId: null,
        isPermmited: 'ACCEPTED',
      },
    });
    noClubMemberId = noClub.memberId;
  });

  beforeEach(() => {
    memberAdminAuth.verifyAdminPassword.mockClear();
    memberAdminAuth.verifyAdminPassword.mockResolvedValue(true);
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.roleAssignment.deleteMany({
      where: {
        memberId: { in: [adminMemberId, targetMemberId, noClubMemberId] },
      },
    });
    await prisma.member.deleteMany({
      where: {
        memberId: { in: [adminMemberId, targetMemberId, noClubMemberId] },
      },
    });
    await prisma.club.deleteMany({
      where: { clubId: { in: [clubAId, clubBId] } },
    });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('getMyStatus', () => {
    it('존재하는 회원이면 DB와 일치하는 엔티티를 반환한다', async () => {
      const result = await profileService.getMyStatus(targetMemberId);

      expect(result.memberId).toBe(targetMemberId);
      expect(result.email).toBe(targetEmail);
      expect(result.nickname).toBe('기존닉');
      expect(result.clubId).toBe(clubAId);
      expect(result.name).toBe('대상회원');
    });

    it('존재하지 않는 memberId면 NotFoundException을 던진다', async () => {
      await expect(
        profileService.getMyStatus(targetMemberId + 99_999),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateMyStatus', () => {
    it('존재하지 않는 memberId면 NotFoundException을 던진다', async () => {
      await expect(
        profileService.updateMyStatus(targetMemberId + 99_999, {
          nickname: '새닉',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('닉네임 변경 후 DB에 반영된다', async () => {
      await profileService.updateMyStatus(targetMemberId, {
        nickname: '통합닉네임',
      });

      const row = await prisma.member.findUnique({
        where: { memberId: targetMemberId },
        select: { nickname: true },
      });
      expect(row?.nickname).toBe('통합닉네임');

      await prisma.member.update({
        where: { memberId: targetMemberId },
        data: { nickname: '기존닉' },
      });
    });
  });

  describe('updateMemberByAdmin', () => {
    it('닉네임만 변경하면 관리자 비밀번호 검증 없이 DB에 반영된다', async () => {
      await profileService.updateMemberByAdmin(adminMemberId, targetMemberId, {
        nickname: '관리자닉',
      });

      expect(memberAdminAuth.verifyAdminPassword).not.toHaveBeenCalled();

      const row = await prisma.member.findUnique({
        where: { memberId: targetMemberId },
        select: { nickname: true },
      });
      expect(row?.nickname).toBe('관리자닉');

      await prisma.member.update({
        where: { memberId: targetMemberId },
        data: { nickname: '기존닉' },
      });
    });

    it('이메일 변경 시 관리자 비밀번호를 검증하고 trim된 이메일을 DB에 저장한다', async () => {
      const newEmail = `  member-profile-new-${runId}@integration.test  `;

      await profileService.updateMemberByAdmin(adminMemberId, targetMemberId, {
        email: newEmail,
        adminPassword: '  admin-secret  ',
      });

      expect(memberAdminAuth.verifyAdminPassword).toHaveBeenCalledTimes(1);
      expect(memberAdminAuth.verifyAdminPassword).toHaveBeenCalledWith(
        adminMemberId,
        'admin-secret',
      );

      const row = await prisma.member.findUnique({
        where: { memberId: targetMemberId },
        select: { email: true },
      });
      expect(row?.email).toBe(newEmail.trim());

      await prisma.member.update({
        where: { memberId: targetMemberId },
        data: { email: targetEmail },
      });
    });

    it('동아리 변경 시 관리자 비밀번호를 검증하고 DB clubId를 갱신한다', async () => {
      await profileService.updateMemberByAdmin(adminMemberId, targetMemberId, {
        clubId: clubBId,
        adminPassword: 'club-pw',
      });

      expect(memberAdminAuth.verifyAdminPassword).toHaveBeenCalledTimes(1);
      expect(memberAdminAuth.verifyAdminPassword).toHaveBeenCalledWith(
        adminMemberId,
        'club-pw',
      );

      const row = await prisma.member.findUnique({
        where: { memberId: targetMemberId },
        select: { clubId: true },
      });
      expect(row?.clubId).toBe(clubBId);

      await prisma.member.update({
        where: { memberId: targetMemberId },
        data: { clubId: clubAId },
      });
    });

    it('관리자 비밀번호 검증 실패 시 UnauthorizedException을 던지고 DB는 변경되지 않는다', async () => {
      memberAdminAuth.verifyAdminPassword.mockResolvedValueOnce(false);

      await expect(
        profileService.updateMemberByAdmin(adminMemberId, targetMemberId, {
          email: `member-profile-fail-${runId}@integration.test`,
          adminPassword: 'wrong',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      const row = await prisma.member.findUnique({
        where: { memberId: targetMemberId },
        select: { email: true },
      });
      expect(row?.email).toBe(targetEmail);
    });

    it('이메일 대소문자만 다르면 비밀번호 검증 없이 갱신한다', async () => {
      await prisma.member.update({
        where: { memberId: targetMemberId },
        data: { email: 'User@Integration.TEST' },
      });

      await profileService.updateMemberByAdmin(adminMemberId, targetMemberId, {
        email: 'user@integration.test',
      });

      expect(memberAdminAuth.verifyAdminPassword).not.toHaveBeenCalled();

      const row = await prisma.member.findUnique({
        where: { memberId: targetMemberId },
        select: { email: true },
      });
      expect(row?.email).toBe('user@integration.test');

      await prisma.member.update({
        where: { memberId: targetMemberId },
        data: { email: targetEmail },
      });
    });

    it('동일 clubId면 비밀번호 검증 없이 이름 trim만 반영한다', async () => {
      await profileService.updateMemberByAdmin(adminMemberId, targetMemberId, {
        clubId: clubAId,
        name: '  새이름  ',
      });

      expect(memberAdminAuth.verifyAdminPassword).not.toHaveBeenCalled();

      const row = await prisma.member.findUnique({
        where: { memberId: targetMemberId },
        select: { name: true },
      });
      expect(row?.name).toBe('새이름');

      await prisma.member.update({
        where: { memberId: targetMemberId },
        data: { name: '대상회원' },
      });
    });
  });
});
