import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { LiveNotificationService } from './live-notification.service';
import type { ILiveNotificationStatePort } from './ports/out/live-notification-state.port';
import type { ILiveNotificationPushPort } from './ports/out/live-notification-push.port';
import type { LiveNotificationMemberLookupPort } from './ports/out/live-notification-member-lookup.port';

describe('LiveNotificationService (라이브 알림 유즈케이스)', () => {
  let service: LiveNotificationService;
  let state: jest.Mocked<ILiveNotificationStatePort>;
  let push: jest.Mocked<ILiveNotificationPushPort>;
  let memberLookup: jest.Mocked<
    Pick<LiveNotificationMemberLookupPort, 'loadMemberForRegistration'>
  >;

  const validExpoToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-01T12:00:00Z'));

    state = {
      register: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      getSessionMemberIds: jest.fn(),
      findAllBySession: jest.fn(),
      clearSession: jest.fn(),
    } as unknown as jest.Mocked<ILiveNotificationStatePort>;

    push = {
      sendLiveNotification: jest.fn(),
    } as unknown as jest.Mocked<ILiveNotificationPushPort>;

    memberLookup = {
      loadMemberForRegistration: jest.fn(),
    };

    service = new LiveNotificationService(
      state,
      push,
      memberLookup as unknown as LiveNotificationMemberLookupPort,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('registerLiveNotification', () => {
    it('회원이 없으면 NotFoundException', async () => {
      memberLookup.loadMemberForRegistration.mockRejectedValue(
        new NotFoundException('회원을 찾을 수 없습니다.'),
      );

      await expect(
        service.registerLiveNotification({ sessionId: 'sess-1' }, 99),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(state.register).not.toHaveBeenCalled();
    });

    it('회원이 있으면 LiveNotificationInfo를 구성해 state.register를 호출한다', async () => {
      memberLookup.loadMemberForRegistration.mockResolvedValue({
        memberId: 42,
        expoToken: validExpoToken,
      });

      await service.registerLiveNotification({ sessionId: 'sess-1' }, 42);

      expect(state.register).toHaveBeenCalledWith({
        memberId: 42,
        sessionId: 'sess-1',
        expoToken: validExpoToken,
        registeredAt: Math.floor(Date.now() / 1000),
      });
    });
  });

  describe('sendLiveNotification', () => {
    it('SESSION_EXTEND인데 endTime이 없으면 Error', async () => {
      state.findAllBySession.mockResolvedValue([
        {
          memberId: 1,
          sessionId: 's',
          expoToken: validExpoToken,
          registeredAt: 0,
        },
      ]);

      await expect(
        service.sendLiveNotification({
          sessionId: 's',
          action: 'SESSION_EXTEND',
        }),
      ).rejects.toThrow('SESSION_EXTEND에는 endTime이 필요합니다.');
      expect(push.sendLiveNotification).not.toHaveBeenCalled();
    });

    it('등록된 라이브 알림이 없으면 push를 호출하지 않는다', async () => {
      state.findAllBySession.mockResolvedValue([]);

      await service.sendLiveNotification({
        sessionId: 's',
        action: 'SESSION_END',
      });

      expect(push.sendLiveNotification).not.toHaveBeenCalled();
    });

    it('유효한 expoToken이 있으면 push에 type과 endsAt을 담아 전송한다', async () => {
      state.findAllBySession.mockResolvedValue([
        {
          memberId: 1,
          sessionId: 's',
          expoToken: validExpoToken,
          registeredAt: 0,
        },
      ]);

      await service.sendLiveNotification({
        sessionId: 's',
        action: 'SESSION_EXTEND',
        endTime: 1717200000,
      });

      expect(push.sendLiveNotification).toHaveBeenCalledWith(
        [validExpoToken],
        {
          type: 'SESSION_EXTEND',
          endsAt: 1717200000 * 1000,
        },
        'high',
      );
    });

    it('expoToken이 모두 null이면 push를 호출하지 않는다', async () => {
      state.findAllBySession.mockResolvedValue([
        {
          memberId: 1,
          sessionId: 's',
          expoToken: null,
          registeredAt: 0,
        },
      ]);

      await service.sendLiveNotification({
        sessionId: 's',
        action: 'SESSION_END',
      });

      expect(push.sendLiveNotification).not.toHaveBeenCalled();
    });
  });

  describe('extendSessionLiveNotifications', () => {
    it('sessionId가 없으면 early return으로 포트를 호출하지 않는다', async () => {
      await service.extendSessionLiveNotifications({
        sessionId: null as unknown as string,
        remainingMsUntilPreviousEnd: 5000,
        endTimeMs: 2,
      });

      expect(state.getSessionMemberIds).not.toHaveBeenCalled();
    });

    it('endTimeMs가 유효하면 sendLiveNotification에 floor(endTimeMs/1000)를 넘긴다', async () => {
      state.getSessionMemberIds.mockResolvedValue([1]);
      state.find.mockResolvedValue({
        memberId: 1,
        sessionId: 'sess-a',
        expoToken: validExpoToken,
        registeredAt: 0,
      });
      state.findAllBySession.mockResolvedValue([
        {
          memberId: 1,
          sessionId: 'sess-a',
          expoToken: validExpoToken,
          registeredAt: 0,
        },
      ]);

      await service.extendSessionLiveNotifications({
        sessionId: 'sess-a',
        remainingMsUntilPreviousEnd: 9999,
        endTimeMs: 12_500,
      });

      expect(push.sendLiveNotification).toHaveBeenCalledWith(
        [validExpoToken],
        expect.objectContaining({
          type: 'SESSION_EXTEND',
        }),
        'high',
      );
      const data = (push.sendLiveNotification.mock.calls[0] ?? [])[1] as {
        endsAt?: number;
      };
      // endTimeMs(ms) → floor/1000 초 → sendLiveNotification에서 endsAt = endTime * 1000
      expect(data.endsAt).toBe(Math.floor(12_500 / 1000) * 1000);
    });

    it('endTimeMs가 없으면 remainingMsUntilPreviousEnd 기반으로 endTime을 계산한다', async () => {
      state.getSessionMemberIds.mockResolvedValue([1]);
      state.find.mockResolvedValue({
        memberId: 1,
        sessionId: 'sess-b',
        expoToken: validExpoToken,
        registeredAt: 0,
      });
      state.findAllBySession.mockResolvedValue([
        {
          memberId: 1,
          sessionId: 'sess-b',
          expoToken: validExpoToken,
          registeredAt: 0,
        },
      ]);

      await service.extendSessionLiveNotifications({
        sessionId: 'sess-b',
        remainingMsUntilPreviousEnd: 8000,
      });

      const data = (push.sendLiveNotification.mock.calls[0] ?? [])[1] as {
        endsAt?: number;
      };
      expect(data.endsAt).toBe(Math.floor(8000 / 1000) * 1000);
    });

    it('연장 대상 알림이 하나도 없으면 sendLiveNotification을 호출하지 않는다', async () => {
      state.getSessionMemberIds.mockResolvedValue([1, 2]);
      state.find.mockResolvedValue(null);

      await service.extendSessionLiveNotifications({
        sessionId: 'sess-c',
        remainingMsUntilPreviousEnd: 5000,
        endTimeMs: 2,
      });

      expect(push.sendLiveNotification).not.toHaveBeenCalled();
    });
  });

  describe('endSessionLiveNotifications', () => {
    it('sessionId가 없으면 early return한다', async () => {
      await service.endSessionLiveNotifications(null as unknown as number);

      expect(state.clearSession).not.toHaveBeenCalled();
    });

    it('세션에 멤버가 있으면 SESSION_END 전송 후 clearSession을 호출한다', async () => {
      state.getSessionMemberIds.mockResolvedValue([10]);
      state.findAllBySession.mockResolvedValue([
        {
          memberId: 10,
          sessionId: 100,
          expoToken: validExpoToken,
          registeredAt: 0,
        },
      ]);

      await service.endSessionLiveNotifications(100);

      expect(push.sendLiveNotification).toHaveBeenCalledWith(
        [validExpoToken],
        { type: 'SESSION_END' },
        'high',
      );
      expect(state.clearSession).toHaveBeenCalledWith(100);
    });

    it('sendLiveNotification이 실패해도 clearSession은 실행된다', async () => {
      state.getSessionMemberIds.mockResolvedValue([10]);
      state.findAllBySession.mockResolvedValue([
        {
          memberId: 10,
          sessionId: 100,
          expoToken: validExpoToken,
          registeredAt: 0,
        },
      ]);
      push.sendLiveNotification.mockRejectedValue(new Error('push failed'));

      await service.endSessionLiveNotifications(100);

      expect(state.clearSession).toHaveBeenCalledWith(100);
    });
  });
});
