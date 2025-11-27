import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { NotificationService } from './notification.service';
import type { IPushDeliveryPort } from './ports/out/push-delivery.port';
import { PrismaNotificationRepository } from '../infrastructure/out/prisma/notification.prisma.repository';
import { PrismaNotificationTokenRepository } from '../infrastructure/out/prisma/notification-token.prisma.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('NotificationService (통합)', () => {
  let prisma: PrismaClient;
  let notificationRepository: PrismaNotificationRepository;
  let tokenRepository: PrismaNotificationTokenRepository;
  let pushDelivery: jest.Mocked<IPushDeliveryPort>;
  let service: NotificationService;
  let warnSpy: jest.SpiedFunction<Logger['warn']>;

  const runId = Date.now();
  const validToken = `ExponentPushToken[svc-int-valid-${runId}]`;
  const invalidToken = 'bad-token-int';

  let validEnableMemberId: number;
  let pushOffMemberId: number;
  let invalidTokenMemberId: number;
  const ghostMemberId = 9_999_999;
  const seededMemberIds: number[] = [];

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    notificationRepository = new PrismaNotificationRepository(
      prisma as unknown as PrismaService,
    );
    tokenRepository = new PrismaNotificationTokenRepository(
      prisma as unknown as PrismaService,
    );

    const validEnable = await prisma.member.create({
      data: {
        email: `notification-svc-valid-${runId}@integration.test`,
        password: 'pw',
        name: '알림서비스-유효',
        enrollmentNumber: `notification-svc-valid-${runId}`,
        clubId: null,
        notificationToken: validToken,
        pushEnable: true,
      },
    });
    const pushOff = await prisma.member.create({
      data: {
        email: `notification-svc-off-${runId}@integration.test`,
        password: 'pw',
        name: '알림서비스-비활성',
        enrollmentNumber: `notification-svc-off-${runId}`,
        clubId: null,
        notificationToken: `ExponentPushToken[svc-int-off-${runId}]`,
        pushEnable: false,
      },
    });
    const invalidTokenMember = await prisma.member.create({
      data: {
        email: `notification-svc-invalid-${runId}@integration.test`,
        password: 'pw',
        name: '알림서비스-무효토큰',
        enrollmentNumber: `notification-svc-invalid-${runId}`,
        clubId: null,
        notificationToken: invalidToken,
        pushEnable: true,
      },
    });

    validEnableMemberId = validEnable.memberId;
    pushOffMemberId = pushOff.memberId;
    invalidTokenMemberId = invalidTokenMember.memberId;
    seededMemberIds.push(
      validEnableMemberId,
      pushOffMemberId,
      invalidTokenMemberId,
    );
  });

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {
      return undefined;
    });

    pushDelivery = {
      isValidPushToken: jest.fn((token: string) =>
        token.startsWith('ExponentPushToken['),
      ),
      send: jest.fn(async () => undefined),
    };

    service = new NotificationService(
      notificationRepository,
      tokenRepository,
      pushDelivery,
    );
  });

  afterEach(async () => {
    warnSpy.mockRestore();

    if (!prisma || seededMemberIds.length === 0) return;

    await prisma.notification.deleteMany({
      where: { memberId: { in: seededMemberIds } },
    });
    await prisma.member.updateMany({
      where: { memberId: { in: seededMemberIds } },
      data: { notificationToken: null, pushEnable: false },
    });

    await prisma.member.update({
      where: { memberId: validEnableMemberId },
      data: { notificationToken: validToken, pushEnable: true },
    });
    await prisma.member.update({
      where: { memberId: pushOffMemberId },
      data: {
        notificationToken: `ExponentPushToken[svc-int-off-${runId}]`,
        pushEnable: false,
      },
    });
    await prisma.member.update({
      where: { memberId: invalidTokenMemberId },
      data: { notificationToken: invalidToken, pushEnable: true },
    });
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.notification.deleteMany({
      where: { memberId: { in: seededMemberIds } },
    });
    await prisma.member.deleteMany({
      where: { memberId: { in: seededMemberIds } },
    });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('sendPushNotifications', () => {
    it('pushEnable이 false여도 알림 레코드는 생성하고 전송 목록에서는 제외한다', async () => {
      await service.sendPushNotifications({
        to: [pushOffMemberId],
        title: '비활성 제목',
        body: '비활성 본문',
        data: { route: '/off' },
      });

      const count = await prisma.notification.count({
        where: { memberId: pushOffMemberId },
      });
      expect(count).toBe(1);
      expect(pushDelivery.isValidPushToken).not.toHaveBeenCalled();
      expect(pushDelivery.send).toHaveBeenCalledWith([]);
    });

    it('유효하지 않은 토큰이면 경고 로그를 남기고 알림만 생성한다', async () => {
      await service.sendPushNotifications({
        to: [invalidTokenMemberId],
        title: '무효 제목',
        body: '무효 본문',
      });

      expect(
        await prisma.notification.count({
          where: { memberId: invalidTokenMemberId },
        }),
      ).toBe(1);
      expect(warnSpy).toHaveBeenCalledWith(
        `Push token ${invalidToken}는 유효하지 않은 Expo push token입니다.`,
      );
      expect(pushDelivery.send).toHaveBeenCalledWith([]);
    });

    it('유효 토큰·pushEnable이면 저장된 title·body로 전송한다', async () => {
      await service.sendPushNotifications({
        to: [validEnableMemberId],
        title: '요청 제목',
        body: '요청 본문',
        data: { id: validEnableMemberId },
      });

      expect(pushDelivery.send).toHaveBeenCalledWith([
        {
          to: validToken,
          title: '요청 제목',
          body: '요청 본문',
          data: { id: validEnableMemberId },
        },
      ]);
    });

    it('토큰 레코드가 없는 memberId는 저장·전송 대상에서 제외한다', async () => {
      await service.sendPushNotifications({
        to: [ghostMemberId, validEnableMemberId],
        title: '고스트 제목',
        body: '고스트 본문',
      });

      expect(
        await prisma.notification.count({
          where: { memberId: ghostMemberId },
        }),
      ).toBe(0);
      expect(
        await prisma.notification.count({
          where: { memberId: validEnableMemberId },
        }),
      ).toBe(1);
      expect(pushDelivery.send).toHaveBeenCalledWith([
        {
          to: validToken,
          title: '고스트 제목',
          body: '고스트 본문',
          data: undefined,
        },
      ]);
    });
  });

  describe('getUserNotifications', () => {
    it('서로 다른 timestamp의 알림을 최신순으로 반환한다', async () => {
      const older = new Date('2020-01-01T00:00:00.000Z');
      const newer = new Date('2024-06-01T00:00:00.000Z');

      await prisma.notification.createMany({
        data: [
          {
            memberId: validEnableMemberId,
            timestamp: older,
            isRead: true,
            data: { title: 'old', body: 'b' },
          },
          {
            memberId: validEnableMemberId,
            timestamp: newer,
            isRead: false,
            data: { title: 'new', body: 'b' },
          },
        ],
      });

      const list = await service.getUserNotifications(validEnableMemberId);

      expect(list).toHaveLength(2);
      expect(list[0].data.title).toBe('new');
      expect(list[1].data.title).toBe('old');
    });
  });

  describe('userReadNotifications', () => {
    it('미읽음 알림을 모두 읽음 처리하고 안내 메시지를 반환한다', async () => {
      await prisma.notification.createMany({
        data: [
          {
            memberId: validEnableMemberId,
            isRead: false,
            data: { title: 'a', body: 'b' },
          },
          {
            memberId: validEnableMemberId,
            isRead: false,
            data: { title: 'c', body: 'd' },
          },
          {
            memberId: validEnableMemberId,
            isRead: true,
            data: { title: 'e', body: 'f' },
          },
        ],
      });

      const result = await service.userReadNotifications(validEnableMemberId);

      expect(result).toEqual({ message: '모든 알림을 읽었어요.' });
      expect(
        await prisma.notification.count({
          where: { memberId: validEnableMemberId, isRead: false },
        }),
      ).toBe(0);
    });
  });

  describe('getNotreadStatus', () => {
    it('미읽음 알림이 있으면 status true를 반환한다', async () => {
      await prisma.notification.create({
        data: {
          memberId: validEnableMemberId,
          isRead: false,
          data: { title: 'unread', body: 'b' },
        },
      });

      const result = await service.getNotreadStatus(validEnableMemberId);

      expect(result).toEqual({ status: true });
    });

    it('모든 알림이 읽음이면 status false를 반환한다', async () => {
      await prisma.notification.create({
        data: {
          memberId: validEnableMemberId,
          isRead: true,
          data: { title: 'read', body: 'b' },
        },
      });

      const result = await service.getNotreadStatus(validEnableMemberId);

      expect(result).toEqual({ status: false });
    });
  });

  describe('deleteNotification', () => {
    it('알림을 삭제하고 안내 메시지를 반환한다', async () => {
      const notification = await prisma.notification.create({
        data: {
          memberId: validEnableMemberId,
          data: { title: 'del', body: 'b' },
        },
      });

      const result = await service.deleteNotification(
        notification.notificationId,
        validEnableMemberId,
      );

      expect(result).toEqual({ message: '알림을 삭제했어요.' });
      expect(
        await prisma.notification.findUnique({
          where: { notificationId: notification.notificationId },
        }),
      ).toBeNull();
    });
  });

  describe('sendAllPushNotifications', () => {
    it('시드된 모든 회원에 알림을 생성하고 유효·활성 토큰만 전송한다', async () => {
      await service.sendAllPushNotifications({
        title: '전체 제목',
        body: '전체 본문',
        data: { broadcast: true },
      });

      for (const id of seededMemberIds) {
        expect(
          await prisma.notification.count({ where: { memberId: id } }),
        ).toBe(1);
      }

      const sentMessages = pushDelivery.send.mock.calls[0]?.[0] ?? [];
      expect(sentMessages).toEqual(
        expect.arrayContaining([
          {
            to: validToken,
            title: '전체 제목',
            body: '전체 본문',
            data: { broadcast: true },
          },
        ]),
      );
      expect(
        sentMessages.some(
          (m) => m.to === `ExponentPushToken[svc-int-off-${runId}]`,
        ),
      ).toBe(false);
      expect(sentMessages.some((m) => m.to === invalidToken)).toBe(false);
    });
  });
});
