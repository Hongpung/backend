import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { PrismaDiscardedReservationRepository } from './discarded-reservation.prisma.repository';

/** Prisma delegate와 jest 제네릭이 겹치며 `mockResolvedValue`가 `never`로 수렴하는 것을 막는다 */
type AnyJestMock = jest.Mock<any>;

type PrismaDiscardedReservationTestDouble = {
  reservation: { findUnique: AnyJestMock };
  discardedReservation: {
    findMany: AnyJestMock;
    count: AnyJestMock;
    upsert: AnyJestMock;
  };
  $transaction: AnyJestMock;
};

/** 리포 단위 테스트용 최소 Prisma 목 */
function buildPrismaMock(): PrismaDiscardedReservationTestDouble {
  return {
    reservation: {
      findUnique: jest.fn(),
    },
    discardedReservation: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

type UpsertCallArg = {
  create: { reservationSnapshot?: unknown; discardReason?: string };
  update: { discardReason?: string };
};

describe('PrismaDiscardedReservationRepository', () => {
  let prisma: PrismaDiscardedReservationTestDouble;
  let repository: PrismaDiscardedReservationRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (
          arg as (tx: PrismaDiscardedReservationTestDouble) => Promise<unknown>
        )(prisma);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg as Promise<unknown>[]);
      }
      throw new Error('unexpected $transaction branch');
    });
    repository = new PrismaDiscardedReservationRepository(
      prisma as unknown as PrismaService,
    );
  });

  describe('findLatest', () => {
    it('skip와 take로 skip * take 값이 findMany에 전달된다', async () => {
      prisma.discardedReservation.findMany.mockResolvedValue([]);
      prisma.discardedReservation.count.mockResolvedValue(0);

      await repository.findLatest(1, 10);

      expect(prisma.discardedReservation.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
    });
  });

  describe('saveNoShowByReservationId', () => {
    it('예약이 없으면 upsert를 호출하지 않는다', async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);

      await repository.saveNoShowByReservationId(999);

      expect(prisma.discardedReservation.upsert).not.toHaveBeenCalled();
    });

    it('reason을 생략하면 discardReason은 NO_SHOW로 저장된다', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        reservationId: 52,
        date: new Date('2025-06-03T00:00:00.000Z'),
        startTime: new Date('2025-06-03T09:00:00.000Z'),
        endTime: new Date('2025-06-03T10:00:00.000Z'),
        title: 't',
        reservationType: 'INDIVIDUAL',
        participationAvailable: true,
        creatorId: null,
        externalCreatorName: null,
        creator: null,
        participators: [],
        borrowInstruments: [],
      } as never);
      prisma.discardedReservation.upsert.mockResolvedValue({} as never);

      await repository.saveNoShowByReservationId(52);

      const call = prisma.discardedReservation.upsert.mock
        .calls[0][0] as UpsertCallArg;
      expect(call.create.discardReason).toBe('NO_SHOW');
      expect(call.update.discardReason).toBe('NO_SHOW');
    });

    it('저장 스냅샷은 HH:mm·YMD·graceMinutes 10 형식이다', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        reservationId: 53,
        date: new Date('2025-06-04T00:00:00.000Z'),
        startTime: new Date('2025-06-04T09:30:00.000Z'),
        endTime: new Date('2025-06-04T10:45:00.000Z'),
        title: 't',
        reservationType: 'INDIVIDUAL',
        participationAvailable: true,
        creatorId: null,
        externalCreatorName: null,
        creator: null,
        participators: [],
        borrowInstruments: [],
      } as never);
      prisma.discardedReservation.upsert.mockResolvedValue({} as never);

      await repository.saveNoShowByReservationId(53);

      const call = prisma.discardedReservation.upsert.mock
        .calls[0][0] as UpsertCallArg;
      const snap = call.create.reservationSnapshot as {
        date: string;
        startTime: string;
        endTime: string;
        policy: { graceMinutes: number };
      };
      expect(snap.date).toBe('2025-06-04');
      expect(snap.startTime).toBe('09:30');
      expect(snap.endTime).toBe('10:45');
      expect(snap.policy).toEqual({ graceMinutes: 10 });
    });
  });
});
