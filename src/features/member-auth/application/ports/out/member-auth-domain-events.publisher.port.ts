import type { MemberRefreshTokenReusedEvent } from 'src/contracts/events/event.payload';
import type { MemberNewDeviceLoginPushNotification } from '../../messaging/member-auth-push-notification.model';

export const MemberAuthDomainEventsPublisherPort = Symbol(
  'MemberAuthDomainEventsPublisherPort',
);

export interface IMemberAuthDomainEventsPublisher {
  publishNewDeviceLoginNotification(
    notification: MemberNewDeviceLoginPushNotification,
  ): Promise<void>;

  publishRefreshTokenReused(payload: MemberRefreshTokenReusedEvent): void;
}
