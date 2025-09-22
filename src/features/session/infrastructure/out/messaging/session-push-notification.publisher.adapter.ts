import { Injectable } from '@nestjs/common';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import { EventBus } from 'src/infrastructure/events/event.provider';
import type { SessionMemberPushNotification } from 'src/features/session/application/models/session-push-notification.model';
import { SessionPushNotificationPort } from 'src/features/session/application/ports/out/session-push-notification.port';
import { buildSessionMemberPushNotification } from './session-push-notification.mapper';

@Injectable()
export class SessionPushNotificationPublisherAdapter
  implements SessionPushNotificationPort
{
  constructor(private readonly eventBus: EventBus) {}

  async sendMemberPush(
    notification: SessionMemberPushNotification,
  ): Promise<void> {
    const payload = buildSessionMemberPushNotification(notification);
    if (!payload) {
      return;
    }

    await this.eventBus.emitAsyncTyped(
      EVENT_TOKEN.SEND_NOTIFICATION,
      payload,
    );
  }
}
