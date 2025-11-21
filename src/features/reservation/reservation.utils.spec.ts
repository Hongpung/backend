import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ReservationTimeUtil } from './reservation.utils';

describe('ReservationTimeUtil', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getReservationDeadline', () => {
    it('예약일 전날 22:00(KST) 시각을 반환한다', () => {
      const deadline = ReservationTimeUtil.getReservationDeadline('2026-05-01');
      expect(deadline.toISOString()).toBe('2026-04-30T13:00:00.000Z');
    });
  });

  describe('canMakeReservation', () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    });

    it('마감 전이면 true', () => {
      jest.setSystemTime(new Date('2026-04-30T12:59:59.999Z'));
      expect(ReservationTimeUtil.canMakeReservation('2026-05-01')).toBe(true);
    });

    it('마감 시각 정각이면 true', () => {
      jest.setSystemTime(new Date('2026-04-30T13:00:00.000Z'));
      expect(ReservationTimeUtil.canMakeReservation('2026-05-01')).toBe(true);
    });

    it('마감 직후면 false', () => {
      jest.setSystemTime(new Date('2026-04-30T13:00:00.001Z'));
      expect(ReservationTimeUtil.canMakeReservation('2026-05-01')).toBe(false);
    });
  });

  describe('canModifyReservation', () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    });

    it('현재 예약일 마감 전·변경 일자 마감 전이면 true', () => {
      jest.setSystemTime(new Date('2026-04-28T12:00:00.000Z'));
      expect(
        ReservationTimeUtil.canModifyReservation('2026-05-01', '2026-05-02'),
      ).toBe(true);
    });

    it('현재 예약일이 이미 마감 지났으면 false', () => {
      jest.setSystemTime(new Date('2026-05-01T14:00:00.000Z'));
      expect(ReservationTimeUtil.canModifyReservation('2026-05-01')).toBe(
        false,
      );
    });

    it('새 예약일 마감을 이미 지났으면 false', () => {
      jest.setSystemTime(new Date('2026-04-30T14:00:00.000Z'));
      expect(
        ReservationTimeUtil.canModifyReservation('2026-05-10', '2026-05-01'),
      ).toBe(false);
    });
  });

  describe('isToday / isTomorrow', () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    });

    it('KST 기준 오늘 날짜와 같으면 isToday true', () => {
      jest.setSystemTime(new Date('2026-05-01T15:00:00.000Z'));
      expect(ReservationTimeUtil.isToday('2026-05-02')).toBe(true);
    });

    it('KST 기준 내일과 같으면 isTomorrow true', () => {
      jest.setSystemTime(new Date('2026-05-01T15:00:00.000Z'));
      expect(ReservationTimeUtil.isTomorrow('2026-05-03')).toBe(true);
    });
  });
});
