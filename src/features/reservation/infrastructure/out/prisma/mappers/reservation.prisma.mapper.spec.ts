import { describe, expect, it } from '@jest/globals';
import { ReservationPrismaMapper } from './reservation.prisma.mapper';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';

function baseMember(memberId: number) {
  return {
    memberId,
    name: `name-${memberId}`,
    nickname: null as string | null,
    email: `${memberId}@e.com`,
    enrollmentNumber: '2021',
    profileImageUrl: null as string | null,
    blogUrl: null as string | null,
    instagramUrl: null as string | null,
    club: { clubName: '동아리' },
    roleAssignment: [{ role: 'MEMBER' as const }],
  };
}

describe('ReservationPrismaMapper', () => {
  describe('toEntity', () => {
    it('REGULAR 예약은 creator가 ReservationCreator이다', () => {
      const prismaData = {
        reservationId: 1,
        date: new Date('2026-05-01T00:00:00.000Z'),
        startTime: new Date('1970-01-01T10:00:00.000Z'),
        endTime: new Date('1970-01-01T11:00:00.000Z'),
        title: '연습',
        reservationType: 'REGULAR',
        participationAvailable: true,
        externalCreatorName: null as string | null,
        creator: baseMember(10),
        participators: [],
        borrowInstruments: [],
      };

      const entity = ReservationPrismaMapper.toEntity(prismaData as any);
      expect(entity.creator).toBeInstanceOf(ReservationCreator);
      expect((entity.creator as ReservationCreator).memberId).toBe(10);
      expect(entity.reservationType).toBe('REGULAR');
    });

    it('EXTERNAL 예약은 creator가 문자열이다', () => {
      const prismaData = {
        reservationId: 2,
        date: new Date('2026-05-02T00:00:00.000Z'),
        startTime: new Date('1970-01-01T09:00:00.000Z'),
        endTime: new Date('1970-01-01T10:00:00.000Z'),
        title: '외부',
        reservationType: 'EXTERNAL',
        participationAvailable: false,
        externalCreatorName: '외부 단체',
        creator: null,
        participators: [],
        borrowInstruments: [],
      };

      const entity = ReservationPrismaMapper.toEntity(prismaData as any);
      expect(entity.creator).toBe('외부 단체');
      expect(entity.reservationType).toBe('EXTERNAL');
    });

    it('EXTERNAL인데 표시명이 없으면 에러', () => {
      const prismaData = {
        reservationId: 3,
        date: new Date('2026-05-03T00:00:00.000Z'),
        startTime: new Date('1970-01-01T10:00:00.000Z'),
        endTime: new Date('1970-01-01T11:00:00.000Z'),
        title: 'x',
        reservationType: 'EXTERNAL',
        participationAvailable: false,
        externalCreatorName: null,
        creator: null,
        participators: [],
        borrowInstruments: [],
      };

      expect(() => ReservationPrismaMapper.toEntity(prismaData as any)).toThrow(
        'EXTERNAL 예약에는 externalCreatorName 또는 연결된 creator 이름이 필요합니다.',
      );
    });

    it('REGULAR인데 creator Member가 없으면 에러', () => {
      const prismaData = {
        reservationId: 4,
        date: new Date('2026-05-04T00:00:00.000Z'),
        startTime: new Date('1970-01-01T10:00:00.000Z'),
        endTime: new Date('1970-01-01T11:00:00.000Z'),
        title: 'x',
        reservationType: 'COMMON',
        participationAvailable: true,
        externalCreatorName: null,
        creator: null,
        participators: [],
        borrowInstruments: [],
      };

      expect(() => ReservationPrismaMapper.toEntity(prismaData as any)).toThrow(
        'REGULAR/COMMON 예약에는 creator(Member)가 필요합니다.',
      );
    });
  });
});
