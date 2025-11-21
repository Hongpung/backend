import { describe, expect, it } from '@jest/globals';
import { ReservationTimeRange } from './reservation-time-range.vo';

describe('ReservationTimeRange', () => {
  describe('create', () => {
    it('endTime이 startTime 이하이면 에러를 던진다', () => {
      expect(() => ReservationTimeRange.create('10:00', '10:00')).toThrow();
      expect(() => ReservationTimeRange.create('12:00', '09:00')).toThrow();
    });

    it('정상 구간을 생성하고 시간을 HH:mm으로 정규화한다', () => {
      const range = ReservationTimeRange.create('9:5', '10:30');
      expect(range.startTime).toBe('09:05');
      expect(range.endTime).toBe('10:30');
    });
  });

  describe('isOverlapping', () => {
    it('겹치는 구간이면 true', () => {
      const a = ReservationTimeRange.create('10:00', '12:00');
      const b = ReservationTimeRange.create('11:00', '13:00');
      expect(a.isOverlapping(b)).toBe(true);
    });

    it('접하는 구간(끝=시작)이면 false', () => {
      const a = ReservationTimeRange.create('10:00', '12:00');
      const b = ReservationTimeRange.create('12:00', '14:00');
      expect(a.isOverlapping(b)).toBe(false);
    });

    it('완전히 분리된 구간이면 false', () => {
      const a = ReservationTimeRange.create('10:00', '11:00');
      const b = ReservationTimeRange.create('11:30', '12:00');
      expect(a.isOverlapping(b)).toBe(false);
    });
  });

  describe('isSameTime / isSameTimeRange', () => {
    it('동일 시작·종료면 true', () => {
      const a = ReservationTimeRange.create('09:00', '10:00');
      const b = ReservationTimeRange.create('09:00', '10:00');
      expect(a.isSameTime(b)).toBe(true);
      expect(a.isSameTimeRange(b)).toBe(true);
    });

    it('다르면 false', () => {
      const a = ReservationTimeRange.create('09:00', '10:00');
      const b = ReservationTimeRange.create('09:00', '11:00');
      expect(a.isSameTime(b)).toBe(false);
    });
  });
});
