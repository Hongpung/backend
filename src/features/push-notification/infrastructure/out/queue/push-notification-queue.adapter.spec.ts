import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { buildNoticeDeepLink } from 'src/contracts/deep-link/deep-link';
import { PushNotificationQueueAdapter } from './push-notification-queue.adapter';
import {
  PUSH_NOTIFICATION_JOB_SEND,
  PUSH_NOTIFICATION_JOB_SEND_ALL,
} from './push-notification-queue.constants';

describe('PushNotificationQueueAdapter', () => {
  let queue: { add: jest.Mock };
  let adapter: PushNotificationQueueAdapter;

  beforeEach(() => {
    queue = {
      add: jest.fn(async () => ({ id: 'job-1' })),
    };
    adapter = new PushNotificationQueueAdapter(queue as any);
  });

  it('수신자가 있으면 jobId 없이 enqueueForRecipients 한다', async () => {
    await adapter.enqueueForRecipients({
      to: [1, 2],
      title: 't',
      body: 'b',
    });

    expect(queue.add).toHaveBeenCalledWith(
      PUSH_NOTIFICATION_JOB_SEND,
      { to: [1, 2], title: 't', body: 'b' },
      expect.not.objectContaining({ jobId: expect.anything() }),
    );
  });

  it('수신자가 없으면 enqueueForRecipients 하지 않는다', async () => {
    await adapter.enqueueForRecipients({ to: [], title: 't', body: 'b' });

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('send-all payload를 enqueueForBroadcast 한다', async () => {
    await adapter.enqueueForBroadcast({
      title: '공지',
      body: '본문',
      data: { url: buildNoticeDeepLink(3) },
    });

    expect(queue.add).toHaveBeenCalledWith(
      PUSH_NOTIFICATION_JOB_SEND_ALL,
      { title: '공지', body: '본문', data: { url: buildNoticeDeepLink(3) } },
      expect.not.objectContaining({ jobId: expect.anything() }),
    );
  });
});
