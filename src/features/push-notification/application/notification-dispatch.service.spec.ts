import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { NotificationDispatchService } from './notification-dispatch.service';
import type { PushNotificationQueuePort } from './ports/out/push-notification-queue.port';

describe('NotificationDispatchService', () => {
  let queue: jest.Mocked<PushNotificationQueuePort>;
  let service: NotificationDispatchService;

  beforeEach(() => {
    queue = {
      enqueueForRecipients: jest.fn(async () => undefined),
      enqueueForBroadcast: jest.fn(async () => undefined),
    };
    service = new NotificationDispatchService(queue);
  });

  it('enqueueSendNotification은 큐 port에 위임한다', async () => {
    const payload = { to: [1], title: 't', body: 'b' };

    await service.enqueueSendNotification(payload);

    expect(queue.enqueueForRecipients).toHaveBeenCalledWith(payload);
  });

  it('enqueueSendAllNotification은 큐 port에 위임한다', async () => {
    const payload = {
      title: '공지',
      body: '본문',
      data: { url: 'https://app.hongpung.com/notice/2' },
    };

    await service.enqueueSendAllNotification(payload);

    expect(queue.enqueueForBroadcast).toHaveBeenCalledWith(payload);
  });
});
