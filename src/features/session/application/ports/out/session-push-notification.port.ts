import type { SessionMemberPushNotification } from '../../models/session-push-notification.model';

export const SessionPushNotificationPort = Symbol('SessionPushNotificationPort');

export interface SessionPushNotificationPort {
  sendMemberPush(notification: SessionMemberPushNotification): Promise<void>;
}
