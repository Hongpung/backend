import { describe, expect, it } from '@jest/globals';
import { DiscardedReservationRequestMapper } from './discarded-reservation.request.mapper';

describe('DiscardedReservationRequestMapper', () => {
  describe('toListQuery', () => {
    it('skip·take를 그대로 반환한다', () => {
      expect(
        DiscardedReservationRequestMapper.toListQuery(0, 20),
      ).toEqual({ skip: 0, take: 20 });
    });

    it('페이지 오프셋 값도 변경 없이 전달한다', () => {
      expect(
        DiscardedReservationRequestMapper.toListQuery(3, 50),
      ).toEqual({ skip: 3, take: 50 });
    });
  });
});
