import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { PrismaNotificationRepository } from './notification.prisma.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('PrismaNotificationRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaNotificationRepository;

  const runId = Date.now();
  const email = `notification-repo-int-${runId}@integration.test`;
  let memberId: number;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new PrismaNotificationRepository(
      prisma as unknown as PrismaService,
    );

    const member = await prisma.member.create({
      data: {
        email,
        password: 'pw',
        name: '알림통합멤버',
        enrollmentNumber: `notification-int-${runId}`,
        clubId: null,
      },
    });
    memberId = member.memberId;
  });

  afterEach(async () => {
    if (!prisma || !memberId) return;
    await prisma.notification.deleteMany({ where: { memberId } });
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.notification.deleteMany({ where: { memberId } });
    await prisma.member.deleteMany({ where: { memberId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('createNotification', () => {
    it('알림을 생성하고 DB에 JSON data가 저장된다', async () => {
      const entity = await repository.createNotification({
        memberId,
        title: '제목',
        body: '본문',
        data: { route: '/notice/1' },
      });

      const row = await prisma.notification.findUnique({
        where: { notificationId: entity.notificationId },
      });

      expect(row).not.toBeNull();
      expect(row!.memberId).toBe(memberId);
      expect(row!.isRead).toBe(false);

      const stored =
        typeof row!.data === 'string' ? JSON.parse(row!.data) : row!.data;
      expect(stored).toEqual({
        title: '제목',
        body: '본문',
        data: { route: '/notice/1' },
      });

      expect(entity.ownerId).toBe(memberId);
      expect(entity.data).toEqual({
        title: '제목',
        body: '본문',
        data: { route: '/notice/1' },
      });
    });
  });

  describe('findNotificationsByMemberId', () => {
    it('timestamp 내림차순으로 알림 목록을 반환한다', async () => {
      const older = new Date('2020-01-01T00:00:00.000Z');
      const newer = new Date('2024-06-01T00:00:00.000Z');

      await prisma.notification.createMany({
        data: [
          {
            memberId,
            timestamp: older,
            isRead: true,
            data: { title: 'old', body: 'b' },
          },
          {
            memberId,
            timestamp: newer,
            isRead: false,
            data: { title: 'new', body: 'b' },
          },
        ],
      });

      const list = await repository.findNotificationsByMemberId(memberId);

      expect(list).toHaveLength(2);
      expect(list[0].data.title).toBe('new');
      expect(list[1].data.title).toBe('old');
    });
  });

  describe('findUnreadNotification', () => {
    it('읽지 않은 알림 하나를 반환한다', async () => {
      await prisma.notification.createMany({
        data: [
          {
            memberId,
            isRead: true,
            data: { title: 'read', body: 'b' },
          },
          {
            memberId,
            isRead: false,
            data: { title: 'unread', body: 'b' },
          },
        ],
      });

      const unread = await repository.findUnreadNotification(memberId);

      expect(unread).not.toBeNull();
      expect(unread!.data.title).toBe('unread');
      expect(unread!.isRead).toBe(false);
    });

    it('읽지 않은 알림이 없으면 null을 반환한다', async () => {
      await prisma.notification.create({
        data: {
          memberId,
          isRead: true,
          data: { title: 'read-only', body: 'b' },
        },
      });

      expect(await repository.findUnreadNotification(memberId)).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('미읽음 알림을 모두 읽음 처리하고 갱신 건수를 반환한다', async () => {
      await prisma.notification.createMany({
        data: [
          { memberId, isRead: false, data: { title: 'a', body: 'b' } },
          { memberId, isRead: false, data: { title: 'c', body: 'd' } },
          { memberId, isRead: true, data: { title: 'e', body: 'f' } },
        ],
      });

      const result = await repository.markAllAsRead(memberId);

      expect(result.count).toBe(2);

      const unreadCount = await prisma.notification.count({
        where: { memberId, isRead: false },
      });
      expect(unreadCount).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('본인 memberId로만 알림을 삭제한다', async () => {
      const notification = await prisma.notification.create({
        data: {
          memberId,
          data: { title: 'del', body: 'b' },
        },
      });

      await repository.deleteNotification(
        notification.notificationId,
        memberId,
      );

      const row = await prisma.notification.findUnique({
        where: { notificationId: notification.notificationId },
      });
      expect(row).toBeNull();
    });

    it('다른 memberId로 삭제하면 Prisma P2025를 던진다', async () => {
      const notification = await prisma.notification.create({
        data: {
          memberId,
          data: { title: 'scoped', body: 'b' },
        },
      });

      await expect(
        repository.deleteNotification(
          notification.notificationId,
          memberId + 99_999,
        ),
      ).rejects.toMatchObject({ code: 'P2025' });
    });
  });

  describe('deleteAllNotifications', () => {
    it('회원의 모든 알림을 삭제하고 건수를 반환한다', async () => {
      await prisma.notification.createMany({
        data: [
          { memberId, data: { title: '1', body: 'b' } },
          { memberId, data: { title: '2', body: 'b' } },
          { memberId, data: { title: '3', body: 'b' } },
        ],
      });

      const result = await repository.deleteAllNotifications(memberId);

      expect(result.count).toBe(3);
      expect(
        await prisma.notification.count({ where: { memberId } }),
      ).toBe(0);
    });
  });

  describe('deleteReadNotificationsOlderThan', () => {
    const cutoff = new Date('2023-06-15T12:00:00.000Z');
    const olderThanCutoff = new Date('2023-06-14T23:59:59.999Z');
    const atCutoff = new Date('2023-06-15T12:00:00.000Z');
    const newerThanCutoff = new Date('2023-06-16T00:00:00.000Z');

    it('읽음·cutoff 이전만 삭제하고 경계·미읽음·신규 읽음 알림은 유지한다', async () => {
      const readOlder = await prisma.notification.create({
        data: {
          memberId,
          isRead: true,
          timestamp: olderThanCutoff,
          data: { title: 'read-older', body: 'b' },
        },
      });
      const readAtCutoff = await prisma.notification.create({
        data: {
          memberId,
          isRead: true,
          timestamp: atCutoff,
          data: { title: 'read-at-cutoff', body: 'b' },
        },
      });
      const unreadOlder = await prisma.notification.create({
        data: {
          memberId,
          isRead: false,
          timestamp: olderThanCutoff,
          data: { title: 'unread-older', body: 'b' },
        },
      });
      const readNewer = await prisma.notification.create({
        data: {
          memberId,
          isRead: true,
          timestamp: newerThanCutoff,
          data: { title: 'read-newer', body: 'b' },
        },
      });

      const result = await repository.deleteReadNotificationsOlderThan(cutoff);

      expect(result.count).toBe(1);

      const remaining = await prisma.notification.findMany({
        where: { memberId },
        orderBy: { notificationId: 'asc' },
      });
      expect(remaining.map((n) => n.notificationId).sort()).toEqual(
        [
          readAtCutoff.notificationId,
          unreadOlder.notificationId,
          readNewer.notificationId,
        ].sort(),
      );
      expect(
        await prisma.notification.findUnique({
          where: { notificationId: readOlder.notificationId },
        }),
      ).toBeNull();
    });

    it('삭제 대상이 없으면 count 0을 반환한다', async () => {
      await prisma.notification.create({
        data: {
          memberId,
          isRead: false,
          timestamp: olderThanCutoff,
          data: { title: 'unread-only', body: 'b' },
        },
      });

      const result = await repository.deleteReadNotificationsOlderThan(cutoff);

      expect(result.count).toBe(0);
      expect(
        await prisma.notification.count({ where: { memberId } }),
      ).toBe(1);
    });
  });
});
