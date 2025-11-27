import { describe, expect, it } from '@jest/globals';
import { NoticeRequestMapper } from './notice.request.mapper';
import type { CreateNoticeReqDto } from '../../dto/request/create-notice.req.dto';
import type { UpdateNoticeReqDto } from '../../dto/request/update-notice.req.dto';

describe('NoticeRequestMapper (공지 HTTP 요청 매핑)', () => {
  describe('toCreateParams', () => {
    it('필수·선택 필드를 CreateNoticeParams로 그대로 옮긴다', () => {
      const dto: CreateNoticeReqDto = {
        title: '새 공지',
        content: '본문입니다.',
        channel: 3,
        noticeAll: true,
      };

      expect(NoticeRequestMapper.toCreateParams(dto)).toEqual({
        title: '새 공지',
        content: '본문입니다.',
        channel: 3,
        noticeAll: true,
      });
    });

    it('channel·noticeAll이 없으면 undefined로 둔다', () => {
      const dto: CreateNoticeReqDto = {
        title: '제목만',
        content: '내용만',
      };

      expect(NoticeRequestMapper.toCreateParams(dto)).toEqual({
        title: '제목만',
        content: '내용만',
        channel: undefined,
        noticeAll: undefined,
      });
    });
  });

  describe('toUpdateParams', () => {
    it('부분 필드만 UpdateNoticeParams로 옮긴다', () => {
      const dto: UpdateNoticeReqDto = {
        title: '수정 제목',
        noticeAll: false,
      };

      expect(NoticeRequestMapper.toUpdateParams(dto)).toEqual({
        title: '수정 제목',
        content: undefined,
        channel: undefined,
        noticeAll: false,
      });
    });

    it('빈 DTO면 모든 필드가 undefined다', () => {
      const dto: UpdateNoticeReqDto = {};

      expect(NoticeRequestMapper.toUpdateParams(dto)).toEqual({
        title: undefined,
        content: undefined,
        channel: undefined,
        noticeAll: undefined,
      });
    });
  });
});
