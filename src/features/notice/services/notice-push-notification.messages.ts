import { josa } from 'es-hangul';
import {
  buildNoticeDeepLink,
  pushNotificationDataWithUrl,
} from 'src/contracts/deep-link/deep-link';
import type { SendAllNotificationEvent } from 'src/contracts/events/event.payload';

export function buildNoticeAllPushPayload(
  noticeId: number,
  title: string,
): SendAllNotificationEvent {
  const truncatedTitle =
    title.length > 10 ? title.substring(0, 10) + '...' : title;

  return {
    title: '공지사항 안내',
    body: `${josa(truncatedTitle, '이/가')} 공지사항에 추가되었습니다.\n참고해주세요.`,
    data: pushNotificationDataWithUrl(buildNoticeDeepLink(noticeId)),
  };
}
