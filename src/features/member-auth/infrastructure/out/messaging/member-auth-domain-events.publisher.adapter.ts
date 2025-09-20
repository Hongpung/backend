import { Injectable } from '@nestjs/common';
import { EventBus } from 'src/infrastructure/events/event.provider';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import type { MemberRefreshTokenReusedEvent } from 'src/contracts/events/event.payload';
import type { MemberNewDeviceLoginPushNotification } from 'src/features/member-auth/application/messaging/member-auth-push-notification.model';
import type { IMemberAuthDomainEventsPublisher } from '../../../application/ports/out/member-auth-domain-events.publisher.port';
import { buildNewDeviceLoginNotification } from './member-auth-push-notification.mapper';

@Injectable()
export class MemberAuthDomainEventsPublisherAdapter
  implements IMemberAuthDomainEventsPublisher
{
  constructor(private readonly eventBus: EventBus) {}

  async publishNewDeviceLoginNotification(
    notification: MemberNewDeviceLoginPushNotification,
  ): Promise<void> {
    await this.eventBus.emitAsyncTyped(
      EVENT_TOKEN.SEND_NOTIFICATION,
      buildNewDeviceLoginNotification(notification),
    );
  }

  publishRefreshTokenReused(payload: MemberRefreshTokenReusedEvent): void {
    this.eventBus.emitTyped(EVENT_TOKEN.MEMBER_REFRESH_TOKEN_REUSED, payload);
  }
}
