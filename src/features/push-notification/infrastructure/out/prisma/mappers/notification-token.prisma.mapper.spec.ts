import { describe, expect, it } from '@jest/globals';
import { UserNotificationTokenEntity } from '../../../../domain/user-notification-token.entity';
import { NotificationTokenPrismaMapper } from './notification-token.prisma.mapper';

describe('NotificationTokenPrismaMapper', () => {
  describe('fromPrismaMember', () => {
    it('Prisma Member 스냅샷을 UserNotificationTokenEntity로 변환한다', () => {
      const entity = NotificationTokenPrismaMapper.fromPrismaMember({
        memberId: 42,
        notificationToken: 'ExponentPushToken[abc]',
        pushEnable: true,
      });
      expect(entity).toBeInstanceOf(UserNotificationTokenEntity);
      expect(entity.memberId).toBe(42);
      expect(entity.notificationToken).toBe('ExponentPushToken[abc]');
      expect(entity.pushEnable).toBe(true);
    });

    it('notificationToken이 null인 멤버도 올바르게 매핑한다', () => {
      const entity = NotificationTokenPrismaMapper.fromPrismaMember({
        memberId: 7,
        notificationToken: null,
        pushEnable: false,
      });
      expect(entity.memberId).toBe(7);
      expect(entity.notificationToken).toBeNull();
      expect(entity.pushEnable).toBe(false);
    });
  });

  describe('toPrismaData', () => {
    it('엔티티를 Prisma member.update data 형태로 변환한다', () => {
      const entity = new UserNotificationTokenEntity(
        1,
        'ExponentPushToken[x]',
        true,
      );
      expect(NotificationTokenPrismaMapper.toPrismaData(entity)).toEqual({
        notificationToken: 'ExponentPushToken[x]',
        pushEnable: true,
      });
    });
  });
});
