import { describe, expect, it } from '@jest/globals';
import {
  DiscardedReservationListVO,
  DiscardedReservationSnapshot,
  DiscardedReservationVO,
} from './discarded-reservation.vo';

function minimalReservationSnapshot(
  overrides: Partial<DiscardedReservationSnapshot> = {},
): DiscardedReservationSnapshot {
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
    ...overrides,
  };
}

describe('DiscardedReservationVO', () => {
  it('create로 생성한 후 모든 getter가 입력 값과 같다', () => {
    const createdAt = new Date('2025-04-30T13:00:00.000Z');
    const reservation = minimalReservationSnapshot({ reservationId: 99 });

    const vo = DiscardedReservationVO.create({
      discardedReservationId: 7,
      reservationId: 99,
      discardedByType: 'SYSTEM',
      discardReason: 'NO_SHOW',
      reservation,
      createdAt,
    });

    expect(vo.discardedReservationId).toBe(7);
    expect(vo.reservationId).toBe(99);
    expect(vo.discardedByType).toBe('SYSTEM');
    expect(vo.discardReason).toBe('NO_SHOW');
    expect(vo.reservation).toEqual(reservation);
    expect(vo.createdAt).toBe(createdAt);
  });
});

describe('DiscardedReservationListVO', () => {
  it('create 후 items 길이와 total이 저장된 값과 같다', () => {
    const createdAt = new Date('2025-04-30T13:00:00.000Z');
    const r = minimalReservationSnapshot();
    const item1 = DiscardedReservationVO.create({
      discardedReservationId: 1,
      reservationId: 1,
      discardedByType: 'ADMIN',
      discardReason: 'ADMIN_FORCE_DISCARD',
      reservation: r,
      createdAt,
    });
    const item2 = DiscardedReservationVO.create({
      discardedReservationId: 2,
      reservationId: 2,
      discardedByType: 'SYSTEM',
      discardReason: 'SYSTEM_RECOVERY',
      reservation: { ...r, reservationId: 2 },
      createdAt,
    });

    const list = DiscardedReservationListVO.create({
      items: [item1, item2],
      total: 42,
    });

    expect(list.items).toHaveLength(2);
    expect(list.items[0]).toBe(item1);
    expect(list.items[1]).toBe(item2);
    expect(list.total).toBe(42);
  });

  it('빈 items와 total 0도 보존된다', () => {
    const list = DiscardedReservationListVO.create({
      items: [],
      total: 0,
    });

    expect(list.items).toEqual([]);
    expect(list.total).toBe(0);
  });
});
