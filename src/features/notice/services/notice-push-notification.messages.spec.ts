import { describe, expect, it } from '@jest/globals';
import { buildNoticeDeepLink } from 'src/contracts/deep-link/deep-link';
import { buildNoticeAllPushPayload } from './notice-push-notification.messages';

describe('notice-push-notification.messages', () => {
  it('공지 전체 푸시 payload를 만든다', () => {
    const result = buildNoticeAllPushPayload(7, '전체 공지');

    expect(result).toEqual({
      title: '공지사항 안내',
      body: '전체 공지가 공지사항에 추가되었습니다.\n참고해주세요.',
      data: { url: buildNoticeDeepLink(7) },
    });
  });

  it('긴 제목은 10자로 잘라 본문에 사용한다', () => {
    const result = buildNoticeAllPushPayload(1, '아주아주아주긴공지제목');

    expect(result.body).toContain('아주아주아주긴공지제...');
  });
});
