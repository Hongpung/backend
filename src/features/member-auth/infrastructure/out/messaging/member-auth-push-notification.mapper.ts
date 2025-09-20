import type { SendNotificationEvent } from 'src/contracts/events/event.payload';
import type { MemberNewDeviceLoginPushNotification } from 'src/features/member-auth/application/messaging/member-auth-push-notification.model';

export function buildNewDeviceLoginNotification(
  notification: MemberNewDeviceLoginPushNotification,
): SendNotificationEvent {
  const label = notification.deviceName?.trim() || '새 기기';

  return {
    to: [notification.memberId],
    title: '새 기기 로그인',
    body: `${label}에서 로그인되었습니다.`,
  };
}
