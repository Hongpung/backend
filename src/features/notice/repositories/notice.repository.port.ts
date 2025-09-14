import type { Notice } from '../models/notice.model';

export const NoticeRepositoryPort = Symbol('NoticeRepositoryPort');

export interface INoticeRepository {
  findAll(): Promise<Notice[]>;
  findById(noticeId: number): Promise<Notice | null>;
  create(params: {
    title: string;
    content: string;
    channel?: number;
  }): Promise<Notice>;
  update(noticeId: number, notice: Notice): Promise<Notice>;
  delete(noticeId: number): Promise<void>;
}
