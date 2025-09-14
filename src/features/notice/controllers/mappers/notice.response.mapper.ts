import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import type { Notice } from '../../models/notice.model';
import {
  NoticeResDto,
  NoticeListResDto,
  NoticeListItemResDto,
  CreateNoticeResDto,
  UpdateNoticeResDto,
  DeleteNoticeResDto,
} from '../../dto/response';

export class NoticeResponseMapper {
  static toNoticeResDto(notice: Notice): NoticeResDto {
    return {
      noticeId: typeof notice.noticeId === 'number' ? notice.noticeId : 0,
      title: notice.title,
      content: notice.content,
      createdAt: AppKstDateTime.dateTimeFormmatForClient(notice.createdAt),
      updatedAt: AppKstDateTime.dateTimeFormmatForClient(notice.updatedAt),
    };
  }

  static toNoticeListItemResDto(notice: Notice): NoticeListItemResDto {
    return {
      noticeId: typeof notice.noticeId === 'number' ? notice.noticeId : 0,
      title: notice.title,
      createdAt: AppKstDateTime.dateTimeFormmatForClient(notice.createdAt),
      updatedAt: AppKstDateTime.dateTimeFormmatForClient(notice.updatedAt),
    };
  }

  static toNoticeListResDto(notices: Notice[]): NoticeListResDto {
    return {
      notices: notices.map((n) => this.toNoticeListItemResDto(n)),
    };
  }

  static toCreateNoticeResDto(
    message = '공지사항 생성이 완료되었습니다.',
  ): CreateNoticeResDto {
    return { message };
  }

  static toUpdateNoticeResDto(
    message = '공지사항 수정이 완료되었습니다.',
  ): UpdateNoticeResDto {
    return { message };
  }

  static toDeleteNoticeResDto(
    message = '공지사항 삭제가 완료되었습니다.',
  ): DeleteNoticeResDto {
    return { message };
  }
}
