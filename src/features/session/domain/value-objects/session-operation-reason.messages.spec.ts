import { describe, expect, it } from '@jest/globals';
import {
  resolveSessionFailReasonMessageKo,
  toSessionBlockedReasonMessageKo,
} from '../session-operation-reason.messages';

describe('session-operation-reason.messages', () => {
  it('차단 사유 코드가 있으면 해당 한글 문구를 우선한다', () => {
    expect(
      resolveSessionFailReasonMessageKo({
        failureReason: 'NOT_ALLOWED',
        blockedReason: 'NEXT_RESERVATION_CONFLICT',
      }),
    ).toBe('다음 예약 10분 전까지 연장했어요.');
  });

  it('차단 사유가 없으면 실패 분류 한글 문구를 쓴다', () => {
    expect(
      resolveSessionFailReasonMessageKo({
        failureReason: 'UNAUTHORIZED',
      }),
    ).toBe('참여할 수 없는 연습이에요.');
  });

  it('NONE이면 blockedReason 메시지는 null이다', () => {
    expect(toSessionBlockedReasonMessageKo('NONE')).toBeNull();
  });

  it('NOT_ATTENDED 한글 문구를 반환한다', () => {
    expect(toSessionBlockedReasonMessageKo('NOT_ATTENDED')).toBe(
      '참여중인 연습이 아니에요.',
    );
  });
});
