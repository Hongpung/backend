import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import type {
  SendAllNotificationEvent,
  SendNotificationEvent,
} from 'src/contracts/events/event.payload';
import { NotificationService } from '../../../application/notification.service';
import {
  PUSH_NOTIFICATION_JOB_SEND,
  PUSH_NOTIFICATION_JOB_SEND_ALL,
  PUSH_NOTIFICATION_QUEUE_NAME,
} from './push-notification-queue.constants';

@Processor(PUSH_NOTIFICATION_QUEUE_NAME)
export class PushNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(PushNotificationProcessor.name);

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async process(
    job: Job<SendNotificationEvent | SendAllNotificationEvent>,
  ): Promise<void> {
    if (job.name === PUSH_NOTIFICATION_JOB_SEND) {
      const { to, title, body, data } = job.data as SendNotificationEvent;
      this.logger.log(
        `Processing push notification job ${job.id} (recipients=${to.length})`,
      );

      await this.notificationService.sendPushNotifications({
        to,
        title,
        body,
        data,
      });
      return;
    }

    if (job.name === PUSH_NOTIFICATION_JOB_SEND_ALL) {
      const { title, body, data } = job.data as SendAllNotificationEvent;
      this.logger.log(`Processing send-all push notification job ${job.id}`);

      await this.notificationService.sendAllPushNotifications({
        title,
        body,
        data,
      });
      return;
    }

    throw new Error(`Unknown push notification job name: ${String(job.name)}`);
  }
}
