import { describe, expect, it } from '@jest/globals';
import type {
  SessionLogDetailReadModel,
  SessionLogListItemReadModel,
} from '../../../../domain/read-models/session-log.read-model';
import { SessionLogResponseMapper } from './session-log.response.mapper';

describe('SessionLogResponseMapper', () => {
  const listItem: SessionLogListItemReadModel = {
    sessionId: 1,
    creatorId: 2,
    creatorName: '홍길동',
    creatorNickname: '길동',
    title: '연습',
    date: '2026-04-15',
    startTime: '10:00',
    endTime: '12:00',
    sessionType: 'REGULAR',
    reservationType: 'REGULAR',
    participationAvailable: true,
    forceEnd: false,
    attendeeCount: 4,
  };

  it('toMonthlyList는 read model 배열을 그대로 반환한다', () => {
    expect(SessionLogResponseMapper.toMonthlyList([listItem])).toEqual([
      listItem,
    ]);
  });

  it('toDetail은 상세 read model을 그대로 반환한다', () => {
    const detail: SessionLogDetailReadModel = {
      ...listItem,
      extendCount: 0,
      returnImageUrl: null,
      reservationId: 99,
      attendanceList: [],
      borrowInstruments: [],
    };

    expect(SessionLogResponseMapper.toDetail(detail)).toEqual(detail);
  });

  it('toDetail은 null을 그대로 반환한다', () => {
    expect(SessionLogResponseMapper.toDetail(null)).toBeNull();
  });
});
