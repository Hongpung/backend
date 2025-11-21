import { describe, expect, it } from '@jest/globals';
import { DiscardedReservationPersistenceMapper } from 'src/features/discarded-reservation/infrastructure/out/mappers/discarded-reservation-persistence.mapper';
import { ReservationPrismaMapper } from '../prisma/mappers/reservation.prisma.mapper';

/**
 * reservation 조회·discard 스냅샷이 동일한 HH:mm / YMD 규약을 쓰는지 고정한다.
 */
describe('reservation ↔ discarded snapshot time contract', () => {
  const dbDate = new Date('2025-06-04T00:00:00.000Z');
  const dbStart = new Date('2025-06-04T09:30:00.000Z');
  const dbEnd = new Date('2025-06-04T10:45:00.000Z');

  const baseReservationRow = {
    reservationId: 1,
    date: dbDate,
    startTime: dbStart,
    endTime: dbEnd,
    title: '연습',
    reservationType: 'REGULAR' as const,
    participationAvailable: true,
    creatorId: 1,
    externalCreatorName: null,
    creator: null,
    participators: [],
    borrowInstruments: [],
  };

  it('discard 스냅샷 시간 필드가 HH:mm·YMD 형식이다', () => {
    const snap = DiscardedReservationPersistenceMapper.toReservationSnapshot(
      baseReservationRow as never,
    );

    expect(snap.date).toBe('2025-06-04');
    expect(snap.startTime).toBe('09:30');
    expect(snap.endTime).toBe('10:45');
  });

  it('reservation entity 시간 문자열과 discard 스냅샷이 동일 규약이다', () => {
    const entity = ReservationPrismaMapper.toEntity({
      ...baseReservationRow,
      creator: {
        memberId: 1,
        name: '홍',
        nickname: null,
        email: 'a@b.c',
        enrollmentNumber: '1',
        club: { clubId: 1, clubName: '풍물' },
        roleAssignment: [],
      },
      participators: [],
      borrowInstruments: [],
    } as never);

    const snap = DiscardedReservationPersistenceMapper.toReservationSnapshot(
      baseReservationRow as never,
    );

    expect(entity.startTime).toBe(snap.startTime);
    expect(entity.endTime).toBe(snap.endTime);
  });
});
