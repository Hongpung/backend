import type {
  CreateNoticeParams,
  UpdateNoticeParams,
} from '../../models/notice.commands';
import type { CreateNoticeReqDto } from '../../dto/request/create-notice.req.dto';
import type { UpdateNoticeReqDto } from '../../dto/request/update-notice.req.dto';

export class NoticeRequestMapper {
  static toCreateParams(dto: CreateNoticeReqDto): CreateNoticeParams {
    return {
      title: dto.title,
      content: dto.content,
      channel: dto.channel,
      noticeAll: dto.noticeAll,
    };
  }

  static toUpdateParams(dto: UpdateNoticeReqDto): UpdateNoticeParams {
    return {
      title: dto.title,
      content: dto.content,
      channel: dto.channel,
      noticeAll: dto.noticeAll,
    };
  }
}
