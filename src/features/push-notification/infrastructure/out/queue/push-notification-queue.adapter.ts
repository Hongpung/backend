import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import type {
  SendAllNotificationEvent,
  SendNotificationEvent,
} from 'src/contracts/events/event.payload';
import { PushNotificationQueuePort } from '../../../application/ports/out/push-notification-queue.port';
import {
  PUSH_NOTIFICATION_JOB_SEND,
  PUSH_NOTIFICATION_JOB_SEND_ALL,
  PUSH_NOTIFICATION_QUEUE_NAME,
} from './push-notification-queue.constants';

@Injectable()
export class PushNotificationQueueAdapter implements PushNotificationQueuePort {
  private readonly logger = new Logger(PushNotificationQueueAdapter.name);

  constructor(
    @InjectQueue(PUSH_NOTIFICATION_QUEUE_NAME)
    private readonly queue: Queue<SendNotificationEvent | SendAllNotificationEvent>,
  ) {}

  async enqueueForRecipients(payload: SendNotificationEvent): Promise<void> {
    if (payload.to.length === 0) {
      return;
    }

    const job = await this.queue.add(PUSH_NOTIFICATION_JOB_SEND, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });

    this.logger.log(
      `Enqueued push notification job ${job.id} (recipients=${payload.to.length})`,
    );
  }

  async enqueueForBroadcast(payload: SendAllNotificationEvent): Promise<void> {
    const job = await this.queue.add(PUSH_NOTIFICATION_JOB_SEND_ALL, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });

    this.logger.log(`Enqueued send-all push notification job ${job.id}`);
  }
}
