import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationCleanupService } from 'src/features/push-notification/application/notification-cleanup.service';

/** 매일 04:00(KST)에 10일 이상 지난 읽음 알림을 DB에서 삭제한다. */
@Injectable()
export class NotificationCleanupSchedulerService {
  private readonly logger = new Logger(NotificationCleanupSchedulerService.name);

  constructor(
    private readonly notificationCleanup: NotificationCleanupService,
  ) {}

  @Cron('0 0 4 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async cleanupReadNotifications(): Promise<void> {
    this.logger.log('Starting daily read-notification cleanup.');
    await this.notificationCleanup.cleanupReadNotifications();
  }
}
