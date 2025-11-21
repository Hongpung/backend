import { describe, expect, it } from '@jest/globals';
import { ReservationControllerRequestMapper } from './reservation-controller.request.mapper';

describe('ReservationControllerRequestMapper', () => {
  describe('toCreateReservationInput', () => {
    it('CreateReservationDto 필드를 application 입력으로 매핑한다', () => {
      const input = ReservationControllerRequestMapper.toCreateReservationInput({
        date: '2026-06-01',
        startTime: '10:00',
        endTime: '11:00',
        title: '연습',
        reservationType: 'REGULAR',
        participationAvailable: true,
        participatorIds: [1, 2],
        borrowInstrumentIds: [10],
      });

      expect(input).toEqual({
        date: '2026-06-01',
        startTime: '10:00',
        endTime: '11:00',
        title: '연습',
        reservationType: 'REGULAR',
        participationAvailable: true,
        participatorIds: [1, 2],
        borrowInstrumentIds: [10],
      });
    });
  });

  describe('toForceUpdateReservationInput', () => {
    it('undefined 필드는 제외한다', () => {
      const input =
        ReservationControllerRequestMapper.toForceUpdateReservationInput({
          title: '수정',
          startTime: undefined,
        } as any);

      expect(input).toEqual({ title: '수정' });
    });
  });

  describe('toBatchReservationInput', () => {
    it('일괄 예약 DTO를 batch 입력으로 매핑한다', () => {
      const input = ReservationControllerRequestMapper.toBatchReservationInput({
        dayTimes: [{ day: 'MON', time: '10:00' }],
        duration: 60,
        batchReservationOption: {
          title: '일괄',
          reservationType: 'COMMON',
          participationAvailable: false,
          participatorIds: [],
          borrowInstrumentIds: [],
        },
      } as any);

      expect(input.dayTimes).toHaveLength(1);
      expect(input.duration).toBe(60);
      expect(input.batchReservationOption.title).toBe('일괄');
    });
  });
});
