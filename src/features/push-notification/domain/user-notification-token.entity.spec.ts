import { describe, expect, it } from '@jest/globals';
import { UserNotificationTokenEntity } from './user-notification-token.entity';

describe('UserNotificationTokenEntity (사용자 알림 토큰 엔티티)', () => {
  describe('registerToken', () => {
    it('토큰을 저장하고 pushEnable이 false였다면 true로 전환한다', () => {
      const entity = new UserNotificationTokenEntity(1, null, false);
      entity.registerToken('ExponentPushToken[aaaa]');
      expect(entity.notificationToken).toBe('ExponentPushToken[aaaa]');
      expect(entity.pushEnable).toBe(true);
    });

    it('pushEnable이 이미 true인 상태에서도 새 토큰으로 갱신한다', () => {
      const entity = new UserNotificationTokenEntity(1, 'old', true);
      entity.registerToken('ExponentPushToken[new]');
      expect(entity.notificationToken).toBe('ExponentPushToken[new]');
      expect(entity.pushEnable).toBe(true);
    });
  });

  describe('enablePush', () => {
    it('등록된 토큰이 없으면 예외를 던진다', () => {
      const entity = new UserNotificationTokenEntity(1, null, false);
      expect(() => entity.enablePush()).toThrow(
        '푸시 수신 활성화 불가: 토큰이 등록되지 않았습니다.',
      );
    });

    it('토큰이 있으면 pushEnable을 true로 만든다', () => {
      const entity = new UserNotificationTokenEntity(
        1,
        'ExponentPushToken[tok]',
        false,
      );
      entity.enablePush();
      expect(entity.pushEnable).toBe(true);
    });
  });

  describe('disablePush', () => {
    it('pushEnable을 false로 만든다', () => {
      const entity = new UserNotificationTokenEntity(
        1,
        'ExponentPushToken[tok]',
        true,
      );
      entity.disablePush();
      expect(entity.pushEnable).toBe(false);
    });
  });

  describe('removeToken', () => {
    it('토큰을 null로 두고 pushEnable을 false로 만든다', () => {
      const entity = new UserNotificationTokenEntity(
        1,
        'ExponentPushToken[tok]',
        true,
      );
      entity.removeToken();
      expect(entity.notificationToken).toBeNull();
      expect(entity.pushEnable).toBe(false);
    });
  });

  describe('isPushEnabled', () => {
    it('pushEnable이 true이고 토큰이 있으면 true다', () => {
      const entity = new UserNotificationTokenEntity(
        1,
        'ExponentPushToken[tok]',
        true,
      );
      expect(Boolean(entity.isPushEnabled())).toBe(true);
    });

    it('pushEnable은 true지만 토큰이 없으면 false다', () => {
      const entity = new UserNotificationTokenEntity(1, null, true);
      expect(Boolean(entity.isPushEnabled())).toBe(false);
    });

    it('토큰은 있지만 pushEnable이 false면 false다', () => {
      const entity = new UserNotificationTokenEntity(
        1,
        'ExponentPushToken[tok]',
        false,
      );
      expect(Boolean(entity.isPushEnabled())).toBe(false);
    });

    it('토큰도 없고 pushEnable도 false면 false다', () => {
      const entity = new UserNotificationTokenEntity(1, null, false);
      expect(Boolean(entity.isPushEnabled())).toBe(false);
    });

    it('빈 문자열 토큰은 falsy라 false로 간주된다', () => {
      const entity = new UserNotificationTokenEntity(1, '', true);
      expect(Boolean(entity.isPushEnabled())).toBe(false);
    });
  });
});
