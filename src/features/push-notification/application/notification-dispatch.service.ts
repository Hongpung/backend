import { Inject, Injectable } from '@nestjs/common';
import type {
  SendAllNotificationEvent,
  SendNotificationEvent,
} from 'src/contracts/events/event.payload';
import {
  PushNotificationQueuePort,
  type PushNotificationQueuePort as IPushNotificationQueuePort,
} from './ports/out/push-notification-queue.port';
import type { NotificationDispatchUseCasePort } from './ports/in/notification-dispatch.use-case.port';

@Injectable()
export class NotificationDispatchService
  implements NotificationDispatchUseCasePort
{
  constructor(
    @Inject(PushNotificationQueuePort)
    private readonly pushNotificationQueue: IPushNotificationQueuePort,
  ) {}

  async enqueueSendNotification(
    payload: SendNotificationEvent,
  ): Promise<void> {
    await this.pushNotificationQueue.enqueueForRecipients(payload);
  }

  async enqueueSendAllNotification(
    payload: SendAllNotificationEvent,
  ): Promise<void> {
    await this.pushNotificationQueue.enqueueForBroadcast(payload);
  }
}
