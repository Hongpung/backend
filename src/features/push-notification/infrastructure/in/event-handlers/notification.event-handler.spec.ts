import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { buildNoticeDeepLink } from 'src/contracts/deep-link/deep-link';
import { NotificationEventHandler } from './notification.event-handler';
import type { NotificationDispatchUseCasePort } from '../../../application/ports/in/notification-dispatch.use-case.port';

describe('NotificationEventHandler', () => {
  let notificationDispatch: jest.Mocked<NotificationDispatchUseCasePort>;
  let handler: NotificationEventHandler;

  beforeEach(() => {
    notificationDispatch = {
      enqueueSendNotification: jest.fn(async () => undefined),
      enqueueSendAllNotification: jest.fn(async () => undefined),
    };
    handler = new NotificationEventHandler(notificationDispatch);
  });

  it('SEND_NOTIFICATION 수신 시 dispatch use case를 호출한다', async () => {
    const payload = { to: [1], title: 't', body: 'b' };

    await handler.handleSendNotification(payload);

    expect(notificationDispatch.enqueueSendNotification).toHaveBeenCalledWith(
      payload,
    );
    expect(notificationDispatch.enqueueSendAllNotification).not.toHaveBeenCalled();
  });

  it('SEND_ALL_NOTIFICATION 수신 시 dispatch use case를 호출한다', async () => {
    const payload = {
      title: '공지사항 안내',
      body: '본문',
      data: { url: buildNoticeDeepLink(7) },
    };

    await handler.handleSendAllNotification(payload);

    expect(notificationDispatch.enqueueSendAllNotification).toHaveBeenCalledWith(
      payload,
    );
    expect(notificationDispatch.enqueueSendNotification).not.toHaveBeenCalled();
  });

  it('SEND_ALL_NOTIFICATION은 data 없이도 dispatch use case를 호출한다', async () => {
    const payload = {
      title: '공지사항 안내',
      body: '본문',
    };

    await handler.handleSendAllNotification(payload);

    expect(notificationDispatch.enqueueSendAllNotification).toHaveBeenCalledWith(
      payload,
    );
  });
});
