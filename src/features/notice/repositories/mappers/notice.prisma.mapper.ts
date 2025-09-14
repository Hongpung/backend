import { Notice, Prisma } from '@prisma/client';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import {
  createNotice,
  type Notice as NoticeModel,
} from '../../models/notice.model';

export class NoticeRepositoryMapper {
  static toModel(prisma: Notice): NoticeModel {
    return createNotice({
      noticeId: prisma.noticeId,
      title: prisma.title,
      content: prisma.content,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      channel: prisma.channel ?? undefined,
    });
  }

  static toCreateInput(
    params: { title: string; content: string },
    channel?: number | null,
  ): Prisma.NoticeCreateInput {
    const now = AppKstDateTime.getNowKoreanTime();
    return {
      title: params.title,
      content: params.content,
      channel: channel ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  static toUpdateInput(notice: NoticeModel): Prisma.NoticeUpdateInput {
    return {
      title: notice.title ?? Prisma.skip,
      content: notice.content ?? Prisma.skip,
      channel: notice.channel ?? Prisma.skip,
      updatedAt: notice.updatedAt ?? AppKstDateTime.getNowKoreanTime(),
    };
  }
}
