import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { IMemberRepository } from 'src/features/member/application/ports/out/member.repository.port';
import { MemberLookupService } from 'src/features/member/application/use-case/member-lookup.use-case';
import { MemberPrismaRepository } from 'src/features/member/infrastructure/out/prisma/member.prisma.repository';
import { PushNotificationMemberLookupAdapter } from './push-notification-member-lookup.adapter';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('PushNotificationMemberLookupAdapter (통합)', () => {
  let prisma: PrismaClient;
  let adapter: PushNotificationMemberLookupAdapter;

  const runId = Date.now();
  let memberId: number;

  const email = `pn-member-lookup-int-${runId}@integration.test`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();

    const memberRepository = new MemberPrismaRepository(
      prisma as unknown as PrismaService,
    );
    const memberLookupService = new MemberLookupService(
      memberRepository as unknown as IMemberRepository,
    );
    adapter = new PushNotificationMemberLookupAdapter(memberLookupService);

    const member = await prisma.member.create({
      data: {
        email,
        password: 'pw',
        name: '푸시알림룩업회원',
        enrollmentNumber: `pn-member-lookup-${runId}`,
        clubId: null,
      },
    });
    memberId = member.memberId;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.member.delete({ where: { memberId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('existsMember', () => {
    it('존재하는 memberId면 true를 반환한다', async () => {
      expect(await adapter.existsMember(memberId)).toBe(true);
    });

    it('존재하지 않는 memberId면 false를 반환한다', async () => {
      expect(await adapter.existsMember(memberId + 99_999)).toBe(false);
    });
  });
});
