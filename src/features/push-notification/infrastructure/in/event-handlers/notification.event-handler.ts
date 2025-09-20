import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import * as EventPayload from 'src/contracts/events/event.payload';
import {
  NotificationDispatchUseCasePort,
  type NotificationDispatchUseCasePort as INotificationDispatchUseCasePort,
} from '../../../application/ports/in/notification-dispatch.use-case.port';

@Injectable()
export class NotificationEventHandler {
  constructor(
    @Inject(NotificationDispatchUseCasePort)
    private readonly notificationDispatch: INotificationDispatchUseCasePort,
  ) {}

  @OnEvent(EVENT_TOKEN.SEND_NOTIFICATION)
  async handleSendNotification(payload: EventPayload.SendNotificationEvent) {
    await this.notificationDispatch.enqueueSendNotification(payload);
  }

  @OnEvent(EVENT_TOKEN.SEND_ALL_NOTIFICATION)
  async handleSendAllNotification(
    payload: EventPayload.SendAllNotificationEvent,
  ) {
    await this.notificationDispatch.enqueueSendAllNotification(payload);
  }
}
