import { josa } from 'es-hangul';
import {
  buildAppDeepLink,
  buildSessionLogDeepLink,
  DEEP_LINK_PATH,
  pushNotificationDataWithUrl,
} from 'src/contracts/deep-link/deep-link';
import type { SendNotificationEvent } from 'src/contracts/events/event.payload';
import {
  SESSION_PUSH_NOTIFICATION_KIND,
  type SessionMemberPushNotification,
} from 'src/features/session/application/models/session-push-notification.model';

function truncateTitle(title: string): string {
  return title.length > 10 ? `${title.substring(0, 10)}...` : title;
}

export function buildSessionMemberPushNotification(
  notification: SessionMemberPushNotification,
): SendNotificationEvent | null {
  if (notification.memberIds.length === 0) {
    return null;
  }

  const truncatedTitle = truncateTitle(notification.sessionTitle);

  switch (notification.kind) {
    case SESSION_PUSH_NOTIFICATION_KIND.FORCE_END:
      return {
        to: notification.memberIds,
        title: '연습실 이용 안내',
        body:
          josa(truncatedTitle, '이/가') +
          ' 시간 제한에 의해 종료 되었습니다.\n다음부터는 시간을 준수해주세요.',
        data: pushNotificationDataWithUrl(
          buildSessionLogDeepLink(notification.sessionLogId),
        ),
      };
    case SESSION_PUSH_NOTIFICATION_KIND.FORCE_END_ALARM:
      return {
        to: notification.memberIds,
        title: '연습실 이용 안내',
        body:
          josa(truncatedTitle, '이/가') +
          '10분 뒤 종료됩니다.\n강제 종료되기 전에 정리 후 사진을 찍어요.',
        data: pushNotificationDataWithUrl(
          buildAppDeepLink(DEEP_LINK_PATH.SESSION_ACTIVE),
        ),
      };
    case SESSION_PUSH_NOTIFICATION_KIND.NO_SHOW_DISCARD:
      return {
        to: notification.memberIds,
        title: '연습 취소 안내',
        body:
          josa(truncatedTitle, '이/가') +
          ' 시간 내 미시작 의해 취소 되었습니다.\n다음부터는 시작 시간을 준수해주세요.',
        data: pushNotificationDataWithUrl(
          buildAppDeepLink(DEEP_LINK_PATH.CHECK_IN),
        ),
      };
    default: {
      const _exhaustive: never = notification;
      return _exhaustive;
    }
  }
}
