import { describe, expect, it } from '@jest/globals';
import type { SessionExtendEvent } from 'src/contracts/events/event.payload';
import { toExtendSessionLiveNotificationInput } from './session-extend-live-notification.mapper';

describe('toExtendSessionLiveNotificationInput', () => {
  it('SessionExtendEvent에서 사용 필드만 ExtendSessionLiveNotificationInput으로 매핑한다', () => {
    const event: SessionExtendEvent = {
      sessionId: 'sess-a',
      remainingMsUntilPreviousEnd: 9999,
      title: '제목',
      startTimeMs: 100,
      endTimeMs: 12_500,
    };

    expect(toExtendSessionLiveNotificationInput(event)).toEqual({
      sessionId: 'sess-a',
      remainingMsUntilPreviousEnd: 9999,
      endTimeMs: 12_500,
    });
  });

  it('endTimeMs가 undefined이면 입력에 endTimeMs를 포함하지 않는다', () => {
    const event = {
      sessionId: 'sess-b',
      remainingMsUntilPreviousEnd: 8000,
      title: '제목',
      startTimeMs: 100,
      endTimeMs: undefined,
    } as SessionExtendEvent;

    expect(toExtendSessionLiveNotificationInput(event)).toEqual({
      sessionId: 'sess-b',
      remainingMsUntilPreviousEnd: 8000,
    });
  });
});
