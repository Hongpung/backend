import { describe, expect, it, jest, beforeEach } from '@jest/globals';

import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

import {

  NotificationCleanupService,

  READ_NOTIFICATION_RETENTION_DAYS,

} from './notification-cleanup.service';

import type { INotificationRepository } from './ports/out/notification.repository.port';



describe('NotificationCleanupService', () => {

  let repository: jest.Mocked<INotificationRepository>;

  let service: NotificationCleanupService;



  beforeEach(() => {

    repository = {

      createNotification: jest.fn(),

      findNotificationsByMemberId: jest.fn(),

      findUnreadNotification: jest.fn(),

      markAllAsRead: jest.fn(),

      deleteNotification: jest.fn(),

      deleteAllNotifications: jest.fn(),

      deleteReadNotificationsOlderThan: jest.fn(),

    };



    service = new NotificationCleanupService(repository);

  });



  it('10일 이상 지난 읽음 알림을 삭제하고 삭제 건수를 반환한다', async () => {

    const now = new Date('2026-05-28T04:00:00+09:00');

    jest.useFakeTimers();

    jest.setSystemTime(now);



    repository.deleteReadNotificationsOlderThan.mockResolvedValue({ count: 12 });



    await expect(service.cleanupReadNotifications()).resolves.toEqual({

      count: 12,

    });



    const nowAnchor = AppKstDateTime.getNowKoreanTime();

    const expectedCutoff = new Date(nowAnchor);

    expectedCutoff.setUTCDate(

      expectedCutoff.getUTCDate() - READ_NOTIFICATION_RETENTION_DAYS,

    );

    expect(repository.deleteReadNotificationsOlderThan).toHaveBeenCalledWith(

      expectedCutoff,

    );



    jest.useRealTimers();

  });

});

