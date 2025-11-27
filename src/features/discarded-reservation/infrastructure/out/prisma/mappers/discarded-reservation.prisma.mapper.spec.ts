import { describe, expect, it } from '@jest/globals';
import { DiscardedReservationPrismaMapper } from './discarded-reservation.prisma.mapper';

describe('DiscardedReservationPrismaMapper', () => {
  describe('normalizeStoredSnapshot', () => {
    it('null·배열·비객체이면 빈 스냅샷을 반환한다', () => {
      expect(
        DiscardedReservationPrismaMapper.normalizeStoredSnapshot(null),
      ).toEqual({});
      expect(
        DiscardedReservationPrismaMapper.normalizeStoredSnapshot([]),
      ).toEqual({});
      expect(
        DiscardedReservationPrismaMapper.normalizeStoredSnapshot('x'),
      ).toEqual({});
    });

    it('legacy ISO 시각을 HH:mm으로 정규화한다', () => {
      const normalized =
        DiscardedReservationPrismaMapper.normalizeStoredSnapshot({
          reservationId: 1,
          date: '2025-04-30',
          startTime: '2025-04-30T10:00:00.000Z',
          endTime: '2025-04-30T11:00:00.000Z',
          title: 'x',
          reservationType: 'INDIVIDUAL',
          participationAvailable: true,
          creatorId: null,
          externalCreatorName: null,
          creatorSnapshot: null,
          participators: [],
          borrowInstruments: [],
        });

      expect(normalized.startTime).toBe('10:00');
      expect(normalized.endTime).toBe('11:00');
      expect(normalized.policy).toEqual({ graceMinutes: 10 });
    });

    it('이미 HH:mm이면 그대로 유지한다', () => {
      const normalized =
        DiscardedReservationPrismaMapper.normalizeStoredSnapshot({
          reservationId: 2,
          date: '2025-05-01',
          startTime: '09:00',
          endTime: '10:30',
          policy: { graceMinutes: 10 },
        });

      expect(normalized.startTime).toBe('09:00');
      expect(normalized.endTime).toBe('10:30');
    });

    it('policy가 없으면 graceMinutes 10을 채운다', () => {
      const normalized =
        DiscardedReservationPrismaMapper.normalizeStoredSnapshot({
          reservationId: 3,
          date: '2025-05-02',
          startTime: '09:00',
          endTime: '10:00',
        });

      expect(normalized.policy).toEqual({ graceMinutes: 10 });
    });
  });

  describe('toDiscardedReservationVO', () => {
    it('행을 VO로 변환하고 스냅샷을 정규화한다', () => {
      const rawDate = new Date('2025-04-30T12:00:00.000Z');
      const vo = DiscardedReservationPrismaMapper.toDiscardedReservationVO({
        discardedReservationId: 7,
        reservationId: 1,
        discardedByType: 'SYSTEM',
        discardReason: 'NO_SHOW',
        reservationSnapshot: {
          reservationId: 1,
          date: '2025-04-30',
          startTime: '2025-04-30T10:00:00.000Z',
          endTime: '2025-04-30T11:00:00.000Z',
          title: 'x',
          reservationType: 'INDIVIDUAL',
          participationAvailable: true,
          creatorId: null,
          externalCreatorName: null,
          creatorSnapshot: null,
          participators: [],
          borrowInstruments: [],
          policy: { graceMinutes: 10 },
        },
        createdAt: rawDate,
      });

      expect(vo.discardedReservationId).toBe(7);
      expect(vo.reservationId).toBe(1);
      expect(vo.discardedByType).toBe('SYSTEM');
      expect(vo.discardReason).toBe('NO_SHOW');
      expect(vo.reservation.startTime).toBe('10:00');
      expect(vo.reservation.endTime).toBe('11:00');
      expect(vo.createdAt).toBe(rawDate);
    });

    it('reservationSnapshot이 null이면 reservation은 빈 객체다', () => {
      const vo = DiscardedReservationPrismaMapper.toDiscardedReservationVO({
        discardedReservationId: 1,
        reservationId: 99,
        discardedByType: 'SYSTEM',
        discardReason: 'NO_SHOW',
        reservationSnapshot: null,
        createdAt: new Date(),
      });

      expect(vo.reservation).toEqual({});
    });
  });

  describe('toReservationSnapshot', () => {
    it('creator가 있으면 creatorSnapshot에 club·roles가 반영된다', () => {
      const reservationDate = new Date('2025-06-01T00:00:00.000Z');
      const start = new Date('2025-06-01T09:00:00.000Z');
      const end = new Date('2025-06-01T10:00:00.000Z');

      const snap = DiscardedReservationPrismaMapper.toReservationSnapshot({
        reservationId: 50,
        date: reservationDate,
        startTime: start,
        endTime: end,
        title: '제목',
        reservationType: 'GROUP',
        participationAvailable: true,
        creatorId: 1,
        externalCreatorName: null,
        creator: {
          memberId: 1,
          name: '홍길동',
          nickname: 'nick',
          email: 'h@test.com',
          enrollmentNumber: '202401',
          club: { clubId: 10, clubName: '동아리' },
          roleAssignment: [
            { roleAssignmentId: 100, role: 'LEADER', clubId: 10 },
          ],
        },
        participators: [],
        borrowInstruments: [],
      } as never);

      expect(snap.date).toBe('2025-06-01');
      expect(snap.startTime).toBe('09:00');
      expect(snap.endTime).toBe('10:00');
      expect(snap.policy).toEqual({ graceMinutes: 10 });
      expect(snap.creatorSnapshot).toEqual({
        memberId: 1,
        name: '홍길동',
        nickname: 'nick',
        email: 'h@test.com',
        enrollmentNumber: '202401',
        club: { clubId: 10, clubName: '동아리' },
        roles: [{ roleAssignmentId: 100, role: 'LEADER', clubId: 10 }],
      });
    });

    it('creator가 없으면 creatorSnapshot은 null이다', () => {
      const snap = DiscardedReservationPrismaMapper.toReservationSnapshot({
        reservationId: 51,
        date: new Date('2025-06-02T00:00:00.000Z'),
        startTime: new Date('2025-06-02T09:00:00.000Z'),
        endTime: new Date('2025-06-02T10:00:00.000Z'),
        title: 't',
        reservationType: 'INDIVIDUAL',
        participationAvailable: false,
        creatorId: null,
        externalCreatorName: '외부',
        creator: null,
        participators: [],
        borrowInstruments: [],
      } as never);

      expect(snap.creatorSnapshot).toBeNull();
    });
  });
});
