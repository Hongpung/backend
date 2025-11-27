import { describe, expect, it } from '@jest/globals';
import type { Notification } from '@prisma/client';
import { NotificationEntity } from '../../../../domain/notification.entity';
import { NotificationPrismaMapper } from './notification.prisma.mapper';

describe('NotificationPrismaMapper', () => {
  const fixedDate = new Date('2024-06-01T12:00:00.000Z');

  describe('fromPrisma', () => {
    it('data가 JSON 문자열이면 파싱된 객체로 NotificationEntity를 만든다', () => {
      const prismaRow = {
        notificationId: 10,
        memberId: 5,
        timestamp: fixedDate,
        isRead: false,
        data: JSON.stringify({
          title: '제목',
          body: '본문',
          data: { kind: 'notice' },
        }),
      } as Notification;

      const entity = NotificationPrismaMapper.fromPrisma(prismaRow);
      expect(entity.notificationId).toBe(10);
      expect(entity.ownerId).toBe(5);
      expect(entity.timestamp).toEqual(fixedDate);
      expect(entity.isRead).toBe(false);
      expect(entity.data).toEqual({
        title: '제목',
        body: '본문',
        data: { kind: 'notice' },
      });
    });

    it('data가 이미 객체이면 그대로 NotificationEntity에 담는다', () => {
      const payload = { title: 't', body: 'b', extra: 1 };
      const prismaRow = {
        notificationId: 2,
        memberId: 3,
        timestamp: fixedDate,
        isRead: true,
        data: payload,
      } as unknown as Notification;

      const entity = NotificationPrismaMapper.fromPrisma(prismaRow);
      expect(entity.data).toBe(payload);
    });
  });
});
