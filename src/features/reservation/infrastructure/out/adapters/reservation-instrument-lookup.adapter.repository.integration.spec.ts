import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { IInstrumentRepository } from 'src/features/instrument/repositories/instrument.repository.port';
import { InstrumentRepository } from 'src/features/instrument/repositories/instrument.repository';
import { ReservationBorrowInstrument } from 'src/features/reservation/domain/entities/reservation-borrow-instrument.entity';
import { ReservationInstrumentLookupAdapter } from './reservation-instrument-lookup.adapter';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('ReservationInstrumentLookupAdapter (통합)', () => {
  let prisma: PrismaClient;
  let instrumentRepository: InstrumentRepository;
  let adapter: ReservationInstrumentLookupAdapter;

  const runId = Date.now();
  let testClubId: number;
  let instrumentId: number;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    instrumentRepository = new InstrumentRepository(
      prisma as unknown as PrismaService,
    );
    adapter = new ReservationInstrumentLookupAdapter(
      instrumentRepository as unknown as IInstrumentRepository,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 51_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `instrument-lookup-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const instrument = await prisma.instrument.create({
      data: {
        instrumentType: 'JANGGU',
        clubId: testClubId,
        name: '룩업-장구',
        borrowAvailable: true,
      },
    });
    instrumentId = instrument.instrumentId;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.instrument.deleteMany({ where: { instrumentId } });
    await prisma.club.delete({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('loadBorrowInstruments', () => {
    it('borrowAvailable 악기를 ReservationBorrowInstrument로 매핑한다', async () => {
      const borrowInstruments = await adapter.loadBorrowInstruments([
        instrumentId,
      ]);

      expect(borrowInstruments).toHaveLength(1);
      expect(borrowInstruments[0]).toBeInstanceOf(ReservationBorrowInstrument);
      expect(borrowInstruments[0].instrumentId).toBe(instrumentId);
      expect(borrowInstruments[0].name).toBe('룩업-장구');
      expect(borrowInstruments[0].instrumentType).toBe('JANGGU');
      expect(borrowInstruments[0].borrowAvailable).toBe(true);
      expect(borrowInstruments[0].clubName).toBe(
        `instrument-lookup-int-club-${testClubId}`,
      );
    });

    it('존재하지 않는 instrumentId면 ForbiddenException을 던진다', async () => {
      await expect(
        adapter.loadBorrowInstruments([instrumentId + 99_999]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('빈 ID 목록이면 저장소를 호출하지 않고 빈 배열을 반환한다', async () => {
      const spy = jest.spyOn(instrumentRepository, 'findByIds');

      const result = await adapter.loadBorrowInstruments([]);

      expect(spy).not.toHaveBeenCalled();
      expect(result).toEqual([]);

      spy.mockRestore();
    });
  });
});
