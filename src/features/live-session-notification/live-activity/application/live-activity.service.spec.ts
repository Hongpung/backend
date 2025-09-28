import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { LiveActivityService } from './live-activity.service';
import type { ILiveActivityStatePort } from './ports/out/live-activity-state.port';
import type { ILiveActivityPushPort } from './ports/out/live-activity-push.port';

describe('LiveActivityService (라이브 액티비티 유즈케이스)', () => {
  let service: LiveActivityService;
  let state: jest.Mocked<ILiveActivityStatePort>;
  let push: jest.Mocked<ILiveActivityPushPort>;

  const apnsToken = 'device-token-abc';
  const liveActivityInfo = {
    memberId: 7,
    sessionId: 'sess-1',
    apnsToken,
    topic: 'com.widepants.HongPung',
    registeredAt: 1_000,
    lastUpdated: 2_000,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-07-01T10:00:00.000Z'));

    state = {
      register: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      getMemberSessionIds: jest.fn(),
      getSessionMemberIds: jest.fn(),
      findAllBySession: jest.fn(),
      clearSession: jest.fn(),
    } as unknown as jest.Mocked<ILiveActivityStatePort>;

    push = {
      sendLiveActivityUpdate: jest.fn(),
      sendLiveActivityEnd: jest.fn(),
    } as unknown as jest.Mocked<ILiveActivityPushPort>;

    service = new LiveActivityService(state, push);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('registerLiveActivity', () => {
    it('topic을 com.widepants.HongPung으로 고정하고 state.register를 호출한다', async () => {
      await service.registerLiveActivity(99, {
        sessionId: 'my-session',
        apnsToken,
      });

      expect(state.register).toHaveBeenCalledWith({
        memberId: 99,
        sessionId: 'my-session',
        apnsToken,
        topic: 'com.widepants.HongPung',
        registeredAt: Math.floor(Date.now() / 1000),
        lastUpdated: Math.floor(Date.now() / 1000),
      });
    });
  });

  describe('updateLiveActivity', () => {
    it('Live Activity가 없으면 push를 호출하지 않는다', async () => {
      state.find.mockResolvedValue(null);

      await service.updateLiveActivity(1, {
        sessionId: 's',
        contentState: { foo: 'bar' },
      });

      expect(state.save).not.toHaveBeenCalled();
      expect(push.sendLiveActivityUpdate).not.toHaveBeenCalled();
    });

    it('Live Activity가 있으면 save 후 sendLiveActivityUpdate를 호출한다', async () => {
      const found = { ...liveActivityInfo, memberId: 1, sessionId: 's' };
      state.find.mockResolvedValue(found);

      const contentState = { title: 't', timerEndDateInMilliseconds: 5000 };
      await service.updateLiveActivity(1, {
        sessionId: 's',
        event: 'update',
        contentState,
      });

      expect(state.save).toHaveBeenCalled();
      const saved = state.save.mock.calls[0]?.[0];
      expect(saved?.lastUpdated).toBe(Date.now());

      expect(push.sendLiveActivityUpdate).toHaveBeenCalledWith({
        deviceToken: apnsToken,
        topic: 'com.widepants.HongPung',
        event: 'update',
        contentState,
        timestamp: Date.now(),
      });
    });
  });

  describe('endLiveActivity', () => {
    it('Live Activity가 없으면 early return한다', async () => {
      state.find.mockResolvedValue(null);

      await service.endLiveActivity(1, 's');

      expect(push.sendLiveActivityEnd).not.toHaveBeenCalled();
      expect(state.remove).not.toHaveBeenCalled();
    });

    it('존재하면 sendLiveActivityEnd 후 remove를 호출한다', async () => {
      const found = { ...liveActivityInfo, memberId: 3, sessionId: 'sx' };
      state.find.mockResolvedValue(found);

      await service.endLiveActivity(3, 'sx');

      expect(push.sendLiveActivityEnd).toHaveBeenCalledWith(
        apnsToken,
        'com.widepants.HongPung',
        Math.floor(Date.now() / 1000),
      );
      expect(state.remove).toHaveBeenCalledWith(3, 'sx');
      expect(push.sendLiveActivityEnd.mock.invocationCallOrder[0]).toBeLessThan(
        state.remove.mock.invocationCallOrder[0] ?? 0,
      );
    });
  });

  describe('extendSessionLiveActivities', () => {
    it('sessionId가 없으면 early return한다', async () => {
      await service.extendSessionLiveActivities({
        sessionId: null as unknown as string,
        remainingMsUntilPreviousEnd: 1000,
        title: '제목',
        startTimeMs: 1,
        endTimeMs: 2,
      });

      expect(state.getSessionMemberIds).not.toHaveBeenCalled();
    });

    it('endTimeMs가 유효하면 timerEndDateInMilliseconds에 endTimeMs를 사용한다', async () => {
      state.getSessionMemberIds.mockResolvedValue([5]);
      state.find.mockResolvedValue({ ...liveActivityInfo, memberId: 5 });

      await service.extendSessionLiveActivities({
        sessionId: 'sx',
        remainingMsUntilPreviousEnd: 99_999,
        title: '부제목',
        startTimeMs: 1_000,
        endTimeMs: 88_888,
      });

      expect(push.sendLiveActivityUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          contentState: expect.objectContaining({
            timerEndDateInMilliseconds: 88_888,
            timerStartDateInMilliseconds: 1_000,
            subtitle: '부제목',
          }),
        }),
      );
    });

    it('endTimeMs가 없으면 timerEnd에 remainingMsUntilPreviousEnd를 사용한다', async () => {
      state.getSessionMemberIds.mockResolvedValue([5]);
      state.find.mockResolvedValue({ ...liveActivityInfo, memberId: 5 });

      await service.extendSessionLiveActivities({
        sessionId: 'sx',
        remainingMsUntilPreviousEnd: 42_000,
        title: '',
        startTimeMs: 1,
        endTimeMs: undefined as unknown as number,
      });

      expect(push.sendLiveActivityUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          contentState: expect.objectContaining({
            timerEndDateInMilliseconds: 42_000,
          }),
        }),
      );
    });

    it('startTimeMs가 없으면 contentState에 timerStartDateInMilliseconds가 없다', async () => {
      state.getSessionMemberIds.mockResolvedValue([5]);
      state.find.mockResolvedValue({ ...liveActivityInfo, memberId: 5 });

      await service.extendSessionLiveActivities({
        sessionId: 'sx',
        remainingMsUntilPreviousEnd: 1000,
        title: 't',
        startTimeMs: undefined as unknown as number,
        endTimeMs: 2000,
      });

      const arg = push.sendLiveActivityUpdate.mock.calls[0]?.[0];
      expect(arg?.contentState).not.toHaveProperty(
        'timerStartDateInMilliseconds',
      );
      expect(arg?.contentState).toMatchObject({
        timerEndDateInMilliseconds: 2000,
      });
    });
  });

  describe('endSessionLiveActivities', () => {
    it('sessionId가 없으면 early return한다', async () => {
      await service.endSessionLiveActivities(null as unknown as number);

      expect(state.findAllBySession).not.toHaveBeenCalled();
    });

    it('세션의 모든 Live Activity에 대해 end를 보낸 뒤 clearSession한다', async () => {
      const a = {
        ...liveActivityInfo,
        memberId: 1,
        apnsToken: 't1',
        topic: 'com.widepants.HongPung',
      };
      const b = {
        ...liveActivityInfo,
        memberId: 2,
        apnsToken: 't2',
        topic: 'com.widepants.HongPung',
      };
      state.findAllBySession.mockResolvedValue([a, b]);

      await service.endSessionLiveActivities(55);

      expect(push.sendLiveActivityEnd).toHaveBeenCalledTimes(2);
      expect(push.sendLiveActivityEnd).toHaveBeenCalledWith(
        't1',
        'com.widepants.HongPung',
        Math.floor(Date.now() / 1000),
      );
      expect(push.sendLiveActivityEnd).toHaveBeenCalledWith(
        't2',
        'com.widepants.HongPung',
        Math.floor(Date.now() / 1000),
      );
      expect(state.clearSession).toHaveBeenCalledWith(55);
    });

    it('개별 end 실패 시에도 나머지 end와 clearSession은 진행한다', async () => {
      const a = { ...liveActivityInfo, memberId: 1, apnsToken: 't1' };
      const b = { ...liveActivityInfo, memberId: 2, apnsToken: 't2' };
      state.findAllBySession.mockResolvedValue([a, b]);
      push.sendLiveActivityEnd
        .mockRejectedValueOnce(new Error('apns fail'))
        .mockResolvedValueOnce(undefined as unknown as never);

      await service.endSessionLiveActivities(99);

      expect(push.sendLiveActivityEnd).toHaveBeenCalledTimes(2);
      expect(state.clearSession).toHaveBeenCalledWith(99);
    });
  });
});
