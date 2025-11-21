import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { buildSessionLogDeepLink } from 'src/contracts/deep-link/deep-link';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import { SESSION_PUSH_NOTIFICATION_KIND } from 'src/features/session/application/models/session-push-notification.model';
import { SessionPushNotificationPublisherAdapter } from './session-push-notification.publisher.adapter';

describe('SessionPushNotificationPublisherAdapter', () => {
  let eventBus: { emitAsyncTyped: jest.Mock };
  let adapter: SessionPushNotificationPublisherAdapter;

  beforeEach(() => {
    eventBus = {
      emitAsyncTyped: jest.fn(async () => []),
    };
    adapter = new SessionPushNotificationPublisherAdapter(eventBus as any);
  });

  it('SessionMemberPushNotification을 mapper로 변환해 SEND_NOTIFICATION을 발행한다', async () => {
    await adapter.sendMemberPush({
      kind: SESSION_PUSH_NOTIFICATION_KIND.FORCE_END,
      memberIds: [9, 10],
      sessionTitle: '연습',
      sessionLogId: 7,
    });

    expect(eventBus.emitAsyncTyped).toHaveBeenCalledWith(
      EVENT_TOKEN.SEND_NOTIFICATION,
      {
        to: [9, 10],
        title: '연습실 이용 안내',
        body: '연습이 시간 제한에 의해 종료 되었습니다.\n다음부터는 시간을 준수해주세요.',
        data: { url: buildSessionLogDeepLink(7) },
      },
    );
  });

  it('수신자가 없으면 이벤트를 발행하지 않는다', async () => {
    await adapter.sendMemberPush({
      kind: SESSION_PUSH_NOTIFICATION_KIND.FORCE_END,
      memberIds: [],
      sessionTitle: '연습',
      sessionLogId: 1,
    });

    expect(eventBus.emitAsyncTyped).not.toHaveBeenCalled();
  });
});
