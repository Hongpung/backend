import { describe, expect, it } from '@jest/globals';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { createNotice } from '../../models/notice.model';
import { NoticeResponseMapper } from './notice.response.mapper';

describe('NoticeResponseMapper (공지 HTTP 응답 매핑)', () => {
  const createdAtFixture = new Date('2025-03-01T01:00:00.000Z');
  const updatedAtFixture = new Date('2025-03-02T02:00:00.000Z');

  describe('toNoticeResDto', () => {
    it('noticeId가 있으면 그대로 응답에 담긴다', () => {
      const notice = createNotice({
        noticeId: 15,
        title: '제목',
        content: '본문',
        createdAt: createdAtFixture,
        updatedAt: updatedAtFixture,
      });

      expect(NoticeResponseMapper.toNoticeResDto(notice)).toEqual({
        noticeId: 15,
        title: '제목',
        content: '본문',
        createdAt: AppKstDateTime.dateTimeFormmatForClient(createdAtFixture),
        updatedAt: AppKstDateTime.dateTimeFormmatForClient(updatedAtFixture),
      });
    });

    it('noticeId가 없으면 noticeId를 0으로 둔다', () => {
      const notice = createNotice({
        title: '제목',
        content: '본문',
        createdAt: createdAtFixture,
        updatedAt: updatedAtFixture,
      });

      expect(NoticeResponseMapper.toNoticeResDto(notice).noticeId).toBe(0);
    });
  });

  describe('toNoticeListResDto', () => {
    it('공지 배열을 목록 형태로 변환한다', () => {
      const a = createNotice({
        noticeId: 1,
        title: 'a',
        content: 'ca',
        createdAt: createdAtFixture,
        updatedAt: updatedAtFixture,
      });
      const b = createNotice({
        noticeId: 2,
        title: 'b',
        content: 'cb',
        createdAt: createdAtFixture,
        updatedAt: updatedAtFixture,
      });

      const dto = NoticeResponseMapper.toNoticeListResDto([a, b]);

      expect(dto.notices).toHaveLength(2);
      expect(dto.notices[0]).toEqual({
        noticeId: 1,
        title: 'a',
        createdAt: AppKstDateTime.dateTimeFormmatForClient(createdAtFixture),
        updatedAt: AppKstDateTime.dateTimeFormmatForClient(updatedAtFixture),
      });
      expect(dto.notices[1]?.title).toBe('b');
    });
  });

  describe('toCreateNoticeResDto', () => {
    it('기본 메시지를 반환한다', () => {
      expect(NoticeResponseMapper.toCreateNoticeResDto().message).toBe(
        '공지사항 생성이 완료되었습니다.',
      );
    });

    it('전달한 메시지로 덮어쓸 수 있다', () => {
      expect(NoticeResponseMapper.toCreateNoticeResDto('커스텀').message).toBe(
        '커스텀',
      );
    });
  });
});
