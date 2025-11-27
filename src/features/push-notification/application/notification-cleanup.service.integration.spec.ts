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
import type { PrismaClient } from '@prisma/client';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import {
  NotificationCleanupService,
  READ_NOTIFICATION_RETENTION_DAYS,
} from './notification-cleanup.service';
import { PrismaNotificationRepository } from '../infrastructure/out/prisma/notification.prisma.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('NotificationCleanupService (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaNotificationRepository;
  let service: NotificationCleanupService;
  let getNowSpy: jest.SpiedFunction<typeof AppKstDateTime.getNowKoreanTime>;

  const fixedAnchor = new Date('2026-05-28T15:00:00.000Z');
  const cutoff = new Date(fixedAnchor);
  cutoff.setUTCDate(cutoff.getUTCDate() - READ_NOTIFICATION_RETENTION_DAYS);

  const runId = Date.now();
  const email = `notification-cleanup-svc-int-${runId}@integration.test`;
  let memberId: number;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new PrismaNotificationRepository(
      prisma as unknown as PrismaService,
    );
    service = new NotificationCleanupService(repository);

    const member = await prisma.member.create({
      data: {
        email,
        password: 'pw',
        name: '알림정리서비스통합',
        enrollmentNumber: `notification-cleanup-svc-int-${runId}`,
        clubId: null,
      },
    });
    memberId = member.memberId;
  });

  beforeEach(async () => {
    getNowSpy = jest
      .spyOn(AppKstDateTime, 'getNowKoreanTime')
      .mockReturnValue(fixedAnchor);

    await prisma.notification.deleteMany({
      where: { isRead: true, timestamp: { lt: cutoff } },
    });
  });

  afterEach(async () => {
    getNowSpy.mockRestore();

    if (!prisma || !memberId) return;
    await prisma.notification.deleteMany({ where: { memberId } });
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.notification.deleteMany({ where: { memberId } });
    await prisma.member.deleteMany({ where: { memberId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('cleanupReadNotifications', () => {
    it('읽음·cutoff 이전만 삭제하고 경계·미읽음·신규 읽음 알림은 유지한다', async () => {
      const readOlder = await prisma.notification.create({
        data: {
          memberId,
          isRead: true,
          timestamp: new Date(cutoff.getTime() - 1),
          data: { title: 'read-older', body: 'b' },
        },
      });
      const readAtCutoff = await prisma.notification.create({
        data: {
          memberId,
          isRead: true,
          timestamp: new Date(cutoff),
          data: { title: 'read-at-cutoff', body: 'b' },
        },
      });
      const unreadOlder = await prisma.notification.create({
        data: {
          memberId,
          isRead: false,
          timestamp: new Date(cutoff.getTime() - 1),
          data: { title: 'unread-older', body: 'b' },
        },
      });
      const readNewer = await prisma.notification.create({
        data: {
          memberId,
          isRead: true,
          timestamp: new Date(cutoff.getTime() + 24 * 60 * 60 * 1000),
          data: { title: 'read-newer', body: 'b' },
        },
      });

      const expectedDeletableCount = await prisma.notification.count({
        where: { isRead: true, timestamp: { lt: cutoff } },
      });

      const result = await service.cleanupReadNotifications();

      expect(result).toEqual({ count: 1 });
      expect(expectedDeletableCount).toBe(1);
      expect(
        await prisma.notification.findUnique({
          where: { notificationId: readOlder.notificationId },
        }),
      ).toBeNull();

      const remainingIds = (
        await prisma.notification.findMany({
          where: { memberId },
          select: { notificationId: true },
        })
      )
        .map((n) => n.notificationId)
        .sort();
      expect(remainingIds).toEqual(
        [
          readAtCutoff.notificationId,
          unreadOlder.notificationId,
          readNewer.notificationId,
        ].sort(),
      );
    });

    it('삭제 대상이 없으면 count 0을 반환한다', async () => {
      await prisma.notification.create({
        data: {
          memberId,
          isRead: false,
          timestamp: new Date(cutoff.getTime() - 1),
          data: { title: 'unread-only', body: 'b' },
        },
      });

      const result = await service.cleanupReadNotifications();

      expect(result).toEqual({ count: 0 });
      expect(
        await prisma.notification.count({ where: { memberId } }),
      ).toBe(1);
    });
  });
});
