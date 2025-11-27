import { describe, expect, it } from '@jest/globals';
import {
  DiscardedReservationListVO,
  DiscardedReservationSnapshot,
  DiscardedReservationVO,
} from 'src/features/discarded-reservation/domain/discarded-reservation.vo';
import { DiscardedReservationResponseMapper } from './discarded-reservation.response.mapper';

function minimalReservationSnapshot(): DiscardedReservationSnapshot {
  return {
    reservationId: 1,
    date: '2025-01-01',
    startTime: '2025-01-01T10:00:00.000Z',
    endTime: '2025-01-01T11:00:00.000Z',
    title: 't',
    reservationType: 'INDIVIDUAL',
    participationAvailable: true,
    creatorId: null,
    externalCreatorName: null,
    creatorSnapshot: null,
    participators: [],
    borrowInstruments: [],
    policy: { graceMinutes: 10 },
  };
}

describe('DiscardedReservationResponseMapper', () => {
  describe('toItemDto', () => {
    it('VO 필드를 DTO에 그대로 옮긴다', () => {
      const createdAt = new Date('2025-04-30T14:00:00.000Z');
      const reservation = minimalReservationSnapshot();
      const vo = DiscardedReservationVO.create({
        discardedReservationId: 10,
        reservationId: 20,
        discardedByType: 'SYSTEM',
        discardReason: 'NO_SHOW',
        reservation,
        createdAt,
      });

      const dto = DiscardedReservationResponseMapper.toItemDto(vo);

      expect(dto).toEqual({
        discardedReservationId: 10,
        reservationId: 20,
        discardedByType: 'SYSTEM',
        discardReason: 'NO_SHOW',
        reservation,
        createdAt,
      });
    });
  });

  describe('toListDto', () => {
    it('items를 각각 toItemDto로 매핑하고 total을 포함한다', () => {
      const createdAt = new Date('2025-04-30T14:00:00.000Z');
      const r1 = minimalReservationSnapshot();
      const r2 = { ...minimalReservationSnapshot(), reservationId: 2 };
      const vo1 = DiscardedReservationVO.create({
        discardedReservationId: 1,
        reservationId: 1,
        discardedByType: 'ADMIN',
        discardReason: 'ADMIN_FORCE_DISCARD',
        reservation: r1,
        createdAt,
      });
      const vo2 = DiscardedReservationVO.create({
        discardedReservationId: 2,
        reservationId: 2,
        discardedByType: 'SYSTEM',
        discardReason: 'SYSTEM_RECOVERY',
        reservation: r2,
        createdAt,
      });
      const list = DiscardedReservationListVO.create({
        items: [vo1, vo2],
        total: 99,
      });

      const dto = DiscardedReservationResponseMapper.toListDto(list);

      expect(dto.total).toBe(99);
      expect(dto.items).toHaveLength(2);
      expect(dto.items[0]).toEqual(
        DiscardedReservationResponseMapper.toItemDto(vo1),
      );
      expect(dto.items[1]).toEqual(
        DiscardedReservationResponseMapper.toItemDto(vo2),
      );
    });

    it('items가 비어있으면 빈 배열과 total만 반환한다', () => {
      const list = DiscardedReservationListVO.create({
        items: [],
        total: 0,
      });

      const dto = DiscardedReservationResponseMapper.toListDto(list);

      expect(dto).toEqual({ items: [], total: 0 });
    });
  });
});
