import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { IMemberRepository } from '../ports/out/member.repository.port';
import { MemberLookupService } from './member-lookup.use-case';
import { MemberPrismaRepository } from '../../infrastructure/out/prisma/member.prisma.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('MemberLookupService (통합)', () => {
  let prisma: PrismaClient;
  let service: MemberLookupService;

  const runId = Date.now();
  let clubId: number;
  let memberId: number;
  let secondMemberId: number;

  const email = `member-lookup-svc-${runId}@integration.test`;
  const secondEmail = `member-lookup-svc-2-${runId}@integration.test`;
  const clubName = `member-lookup-club-${runId}`;
  const notificationToken = `expo-lookup-token-${runId}`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();

    const repository = new MemberPrismaRepository(
      prisma as unknown as PrismaService,
    );
    service = new MemberLookupService(repository as unknown as IMemberRepository);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    clubId = (maxClub._max.clubId ?? 0) + 47_000;

    await prisma.club.create({
      data: {
        clubId,
        clubName,
        profileImageUrl: null,
      },
    });

    const member = await prisma.member.create({
      data: {
        email,
        password: 'pw',
        name: '룩업회원',
        nickname: '룩업닉',
        enrollmentNumber: `member-lookup-${runId}`,
        clubId,
        isPermmited: 'ACCEPTED',
        notificationToken,
      },
    });
    memberId = member.memberId;

    await prisma.roleAssignment.create({
      data: {
        clubId,
        memberId,
        role: 'LEADER',
      },
    });

    const second = await prisma.member.create({
      data: {
        email: secondEmail,
        password: 'pw',
        name: '룩업두번째',
        enrollmentNumber: `member-lookup-2-${runId}`,
        clubId,
        isPermmited: 'ACCEPTED',
      },
    });
    secondMemberId = second.memberId;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.roleAssignment.deleteMany({
      where: { clubId },
    });
    await prisma.member.deleteMany({
      where: { memberId: { in: [memberId, secondMemberId] } },
    });
    await prisma.club.delete({ where: { clubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('findMemberByMemberId', () => {
    it('Prisma 회원을 MemberLookupReadModel로 매핑한다', async () => {
      const result = await service.findMemberByMemberId(memberId);

      expect(result).not.toBeNull();
      expect(result!.memberId).toBe(memberId);
      expect(result!.name).toBe('룩업회원');
      expect(result!.nickname).toBe('룩업닉');
      expect(result!.email).toBe(email);
      expect(result!.enrollmentNumber).toBe(`member-lookup-${runId}`);
      expect(result!.clubName).toBe(clubName);
      expect(result!.roles).toEqual(['LEADER']);
      expect(result!.notificationToken).toBe(notificationToken);
    });

    it('존재하지 않는 memberId면 null을 반환한다', async () => {
      expect(await service.findMemberByMemberId(memberId + 99_999)).toBeNull();
    });
  });

  describe('findMembersByIds', () => {
    it('여러 memberId를 ReadModel 배열로 매핑한다', async () => {
      const result = await service.findMembersByIds([memberId, secondMemberId]);

      expect(result).toHaveLength(2);
      const ids = result.map((m) => m.memberId).sort((a, b) => a - b);
      expect(ids).toEqual([memberId, secondMemberId].sort((a, b) => a - b));

      const primary = result.find((m) => m.memberId === memberId);
      expect(primary!.clubName).toBe(clubName);
      expect(primary!.roles).toEqual(['LEADER']);
      expect(primary!.notificationToken).toBe(notificationToken);
    });

    it('빈 배열이면 빈 배열을 반환한다', async () => {
      expect(await service.findMembersByIds([])).toEqual([]);
    });

    it('존재·미존재 ID 혼합 시 존재 회원만 반환한다', async () => {
      const result = await service.findMembersByIds([
        memberId,
        memberId + 99_999,
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]!.memberId).toBe(memberId);
      expect(result[0]!.roles).toEqual(['LEADER']);
    });
  });

  describe('existsMember', () => {
    it('존재하는 memberId면 true를 반환한다', async () => {
      expect(await service.existsMember(memberId)).toBe(true);
    });

    it('존재하지 않는 memberId면 false를 반환한다', async () => {
      expect(await service.existsMember(memberId + 99_999)).toBe(false);
    });
  });
});
