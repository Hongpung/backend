import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

export interface Notice {
  noticeId?: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  channel?: number;
}

export function createNotice(notice: {
  noticeId?: number;
  title: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
  channel?: number;
}): Notice {
  return {
    noticeId: notice.noticeId,
    title: notice.title,
    content: notice.content,
    createdAt: notice.createdAt ?? AppKstDateTime.getNowKoreanTime(),
    updatedAt: notice.updatedAt ?? AppKstDateTime.getNowKoreanTime(),
    channel: notice.channel,
  };
}

export function updateNotice(
  notice: Notice,
  partial: { title?: string; content?: string; channel?: number },
): Notice {
  return {
    ...notice,
    title: partial.title ?? notice.title,
    content: partial.content ?? notice.content,
    channel: partial.channel ?? notice.channel,
    updatedAt: AppKstDateTime.getNowKoreanTime(),
  };
}
