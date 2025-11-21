import { describe, expect, it } from '@jest/globals';
import { ReservationControllerResponseMapper } from './reservation-controller.response.mapper';

describe('ReservationControllerResponseMapper', () => {
  describe('toOccupiedSlot', () => {
    it('DB Date 시각을 HH:mm 문자열로 변환한다', () => {
      const result = ReservationControllerResponseMapper.toOccupiedSlot({
        reservationId: 1,
        title: '연습',
        reservationType: 'REGULAR',
        creator: { name: '홍길동' },
        externalCreatorName: null,
        startTime: new Date('1970-01-01T10:00:00.000Z'),
        endTime: new Date('1970-01-01T11:30:00.000Z'),
      });

      expect(result.startTime).toBe('10:00');
      expect(result.endTime).toBe('11:30');
      expect(result.creator).toEqual({ name: '홍길동' });
    });

    it('EXTERNAL 예약은 externalCreatorName을 노출한다', () => {
      const result = ReservationControllerResponseMapper.toOccupiedSlot({
        reservationId: 2,
        title: '외부',
        reservationType: 'EXTERNAL',
        creator: null,
        externalCreatorName: '외부 단체',
        startTime: new Date('1970-01-01T09:00:00.000Z'),
        endTime: new Date('1970-01-01T10:00:00.000Z'),
      });

      expect(result.externalCreatorName).toBe('외부 단체');
      expect(result.creator).toBeNull();
    });
  });
});
