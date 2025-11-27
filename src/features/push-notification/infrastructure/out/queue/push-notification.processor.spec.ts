import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import {
  buildAppDeepLink,
  buildNoticeDeepLink,
  DEEP_LINK_PATH,
} from 'src/contracts/deep-link/deep-link';
import { Job } from 'bullmq';
import { PushNotificationProcessor } from './push-notification.processor';
import {
  PUSH_NOTIFICATION_JOB_SEND,
  PUSH_NOTIFICATION_JOB_SEND_ALL,
} from './push-notification-queue.constants';

describe('PushNotificationProcessor', () => {
  let notificationService: {
    sendPushNotifications: jest.Mock;
    sendAllPushNotifications: jest.Mock;
  };
  let processor: PushNotificationProcessor;

  beforeEach(() => {
    notificationService = {
      sendPushNotifications: jest.fn(async () => undefined),
      sendAllPushNotifications: jest.fn(async () => undefined),
    };
    processor = new PushNotificationProcessor(notificationService as any);
  });

  it('큐 job payload로 sendPushNotifications를 호출한다', async () => {
    const job = {
      id: 'job-1',
      name: PUSH_NOTIFICATION_JOB_SEND,
      data: {
        to: [9],
        title: '연습실 이용 안내',
        body: '종료',
        data: { url: buildAppDeepLink(DEEP_LINK_PATH.SESSION_ACTIVE) },
      },
    } as Job;

    await processor.process(job);

    expect(notificationService.sendPushNotifications).toHaveBeenCalledWith({
      to: [9],
      title: '연습실 이용 안내',
      body: '종료',
      data: { url: buildAppDeepLink(DEEP_LINK_PATH.SESSION_ACTIVE) },
    });
    expect(notificationService.sendAllPushNotifications).not.toHaveBeenCalled();
  });

  it('send-all job은 sendAllPushNotifications를 호출한다', async () => {
    const job = {
      id: 'job-2',
      name: PUSH_NOTIFICATION_JOB_SEND_ALL,
      data: {
        title: '공지사항 안내',
        body: '새 공지',
        data: { url: buildNoticeDeepLink(12) },
      },
    } as Job;

    await processor.process(job);

    expect(notificationService.sendAllPushNotifications).toHaveBeenCalledWith({
      title: '공지사항 안내',
      body: '새 공지',
      data: { url: buildNoticeDeepLink(12) },
    });
    expect(notificationService.sendPushNotifications).not.toHaveBeenCalled();
  });
});
