import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { PushNotificationTokenService } from './push-notification-token.service';
import { PrismaNotificationTokenRepository } from '../infrastructure/out/prisma/notification-token.prisma.repository';
import { PushNotificationMemberLookupAdapter } from '../infrastructure/out/adapters/push-notification-member-lookup.adapter';
import type { IMemberRepository } from 'src/features/member/application/ports/out/member.repository.port';
import { MemberLookupService } from 'src/features/member/application/use-case/member-lookup.use-case';
import { MemberPrismaRepository } from 'src/features/member/infrastructure/out/prisma/member.prisma.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('PushNotificationTokenService (통합)', () => {
  let prisma: PrismaClient;
  let service: PushNotificationTokenService;

  const runId = Date.now();
  const email = `push-token-svc-int-${runId}@integration.test`;
  const validToken = `ExponentPushToken[svc-int-${runId}]`;
  let memberId: number;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();

    const tokenRepository = new PrismaNotificationTokenRepository(
      prisma as unknown as PrismaService,
    );
    const memberRepository = new MemberPrismaRepository(
      prisma as unknown as PrismaService,
    );
    const memberLookupService = new MemberLookupService(
      memberRepository as unknown as IMemberRepository,
    );
    const memberLookup = new PushNotificationMemberLookupAdapter(
      memberLookupService,
    );

    service = new PushNotificationTokenService(tokenRepository, memberLookup);

    const member = await prisma.member.create({
      data: {
        email,
        password: 'pw',
        name: '푸시토큰서비스통합',
        enrollmentNumber: `push-token-svc-int-${runId}`,
        clubId: null,
      },
    });
    memberId = member.memberId;
  });

  afterEach(async () => {
    if (!prisma || !memberId) return;

    await prisma.member.update({
      where: { memberId },
      data: { notificationToken: null, pushEnable: false },
    });
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.member.deleteMany({ where: { memberId } });
    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('updatePushNotificationToken', () => {
    it('유효한 토큰을 DB에 저장한다', async () => {
      const result = await service.updatePushNotificationToken(memberId, {
        notificationToken: validToken,
        pushEnable: false,
      });

      expect(result).toEqual({ message: '알림 토큰이 등록되었습니다.' });

      const row = await prisma.member.findUnique({
        where: { memberId },
        select: { notificationToken: true, pushEnable: true },
      });
      expect(row?.notificationToken).toBe(validToken);
      expect(row?.pushEnable).toBe(false);
    });

    it('pushEnable을 생략하면 기본값 true로 저장한다', async () => {
      await service.updatePushNotificationToken(memberId, {
        notificationToken: validToken,
      });

      const row = await prisma.member.findUnique({
        where: { memberId },
        select: { notificationToken: true, pushEnable: true },
      });
      expect(row?.notificationToken).toBe(validToken);
      expect(row?.pushEnable).toBe(true);
    });

    it('pushEnable만 false이면 기존 토큰을 유지한다', async () => {
      await prisma.member.update({
        where: { memberId },
        data: { notificationToken: validToken, pushEnable: true },
      });

      const result = await service.updatePushNotificationToken(memberId, {
        pushEnable: false,
      });

      expect(result).toEqual({ message: '알림 수신 설정이 변경되었습니다.' });

      const row = await prisma.member.findUnique({
        where: { memberId },
        select: { notificationToken: true, pushEnable: true },
      });
      expect(row?.notificationToken).toBe(validToken);
      expect(row?.pushEnable).toBe(false);
    });
  });

  describe('clearPushNotificationToken', () => {
    it('토큰을 제거하고 삭제 메시지를 반환한다', async () => {
      await prisma.member.update({
        where: { memberId },
        data: { notificationToken: validToken, pushEnable: true },
      });

      const result = await service.clearPushNotificationToken(memberId);

      expect(result).toEqual({ message: '알림 토큰이 삭제되었습니다.' });

      const row = await prisma.member.findUnique({
        where: { memberId },
        select: { notificationToken: true, pushEnable: true },
      });
      expect(row?.notificationToken).toBeNull();
      expect(row?.pushEnable).toBe(false);
    });
  });

  describe('clearPushToken', () => {
    it('토큰을 DB에서 제거한다', async () => {
      await prisma.member.update({
        where: { memberId },
        data: { notificationToken: validToken, pushEnable: true },
      });

      await service.clearPushToken(memberId);

      const row = await prisma.member.findUnique({
        where: { memberId },
        select: { notificationToken: true, pushEnable: true },
      });
      expect(row?.notificationToken).toBeNull();
      expect(row?.pushEnable).toBe(false);
    });
  });
});
