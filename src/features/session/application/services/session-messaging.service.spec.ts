import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { SessionMessagingService } from './session-messaging.service';
import type { SessionPushNotificationPort } from '../ports/out/session-push-notification.port';
import type { SessionRuntimePort } from '../ports/out/session-runtime.port';
import {
  SESSION_PUSH_NOTIFICATION_KIND,
  type SessionPushSessionSnapshot,
} from '../models/session-push-notification.model';

describe('SessionMessagingService', () => {
  let pushNotification: jest.Mocked<SessionPushNotificationPort>;
  let sessionRuntime: jest.Mocked<
    Pick<SessionRuntimePort, 'getOnairAttendanceMemberIds'>
  >;
  let service: SessionMessagingService;

  const baseSnapshot: SessionPushSessionSnapshot = {
    sessionId: 'sid-1',
    title: '연습',
    sessionType: 'REALTIME',
    attendance: [{ memberId: 9, status: '참가' }],
  };

  beforeEach(() => {
    pushNotification = {
      sendMemberPush: jest.fn(async () => undefined),
    };
    sessionRuntime = {
      getOnairAttendanceMemberIds: jest.fn(() => []),
    };
    service = new SessionMessagingService(
      pushNotification,
      sessionRuntime as unknown as SessionRuntimePort,
    );
  });

  it('강제 종료: ONAIR 출석이 없으면 job 스냅샷 출석자에게 푸시한다', async () => {
    await service.notifyForceEnd(baseSnapshot, 42);

    expect(pushNotification.sendMemberPush).toHaveBeenCalledWith({
      kind: SESSION_PUSH_NOTIFICATION_KIND.FORCE_END,
      memberIds: [9],
      sessionTitle: '연습',
      sessionLogId: 42,
    });
  });

  it('강제 종료: ONAIR 출석 목록이 있으면 스냅샷보다 라이브 목록을 우선한다', async () => {
    sessionRuntime.getOnairAttendanceMemberIds.mockReturnValue([42, 43]);

    await service.notifyForceEnd(baseSnapshot, 99);

    expect(pushNotification.sendMemberPush).toHaveBeenCalledWith({
      kind: SESSION_PUSH_NOTIFICATION_KIND.FORCE_END,
      memberIds: [42, 43],
      sessionTitle: '연습',
      sessionLogId: 99,
    });
  });

  it('외부 예약 세션은 강제 종료 푸시를 보내지 않는다', async () => {
    await service.notifyForceEnd(
      {
        ...baseSnapshot,
        sessionType: 'RESERVED',
        reservationType: 'EXTERNAL',
      },
      1,
    );

    expect(pushNotification.sendMemberPush).not.toHaveBeenCalled();
  });
});
