export type CreateNoticeParams = {
  title: string;
  content: string;
  channel?: number;
  noticeAll?: boolean;
};

export type UpdateNoticeParams = {
  title?: string;
  content?: string;
  channel?: number;
  noticeAll?: boolean;
};
