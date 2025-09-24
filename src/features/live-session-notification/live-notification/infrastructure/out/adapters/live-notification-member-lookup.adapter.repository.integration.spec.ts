import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { IMemberRepository } from 'src/features/member/application/ports/out/member.repository.port';
import { MemberLookupService } from 'src/features/member/application/use-case/member-lookup.use-case';
import { MemberPrismaRepository } from 'src/features/member/infrastructure/out/prisma/member.prisma.repository';
import { LiveNotificationMemberLookupAdapter } from './live-notification-member-lookup.adapter';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('LiveNotificationMemberLookupAdapter (통합)', () => {
  let prisma: PrismaClient;
  let adapter: LiveNotificationMemberLookupAdapter;

  const runId = Date.now();
  let memberId: number;
  let memberWithoutTokenId: number;

  const email = `lsn-member-lookup-int-${runId}@integration.test`;
  const emailWithoutToken = `lsn-member-lookup-no-token-${runId}@integration.test`;
  const notificationToken = `expo-lsn-lookup-${runId}`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();

    const memberRepository = new MemberPrismaRepository(
      prisma as unknown as PrismaService,
    );
    const memberLookupService = new MemberLookupService(
      memberRepository as unknown as IMemberRepository,
    );
    adapter = new LiveNotificationMemberLookupAdapter(memberLookupService);

    const member = await prisma.member.create({
      data: {
        email,
        password: 'pw',
        name: '라이브알림룩업회원',
        enrollmentNumber: `lsn-member-lookup-${runId}`,
        clubId: null,
        notificationToken,
      },
    });
    memberId = member.memberId;

    const memberWithoutToken = await prisma.member.create({
      data: {
        email: emailWithoutToken,
        password: 'pw',
        name: '토큰없음회원',
        enrollmentNumber: `lsn-member-lookup-no-token-${runId}`,
        clubId: null,
        notificationToken: null,
      },
    });
    memberWithoutTokenId = memberWithoutToken.memberId;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.member.deleteMany({
      where: { memberId: { in: [memberId, memberWithoutTokenId] } },
    });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('loadMemberForRegistration', () => {
    it('DB 회원을 등록용 read model로 매핑한다', async () => {
      const result = await adapter.loadMemberForRegistration(memberId);

      expect(result).toEqual({
        memberId,
        expoToken: notificationToken,
      });
    });

    it('존재하지 않는 memberId면 NotFoundException을 던진다', async () => {
      await expect(
        adapter.loadMemberForRegistration(memberId + 99_999),
      ).rejects.toThrow(NotFoundException);
    });

    it('notificationToken이 null이면 expoToken을 null로 반환한다', async () => {
      const result =
        await adapter.loadMemberForRegistration(memberWithoutTokenId);

      expect(result).toEqual({
        memberId: memberWithoutTokenId,
        expoToken: null,
      });
    });
  });
});
