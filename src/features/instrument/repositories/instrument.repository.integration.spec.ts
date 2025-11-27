import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import {
  createInstrument,
  createInstrumentClub,
} from '../models/instrument.model';
import { InstrumentRepository } from './instrument.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('InstrumentRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: InstrumentRepository;
  let clubIdA: number;
  let clubIdB: number;
  const createdInstrumentIds: number[] = [];

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new InstrumentRepository(prisma as unknown as PrismaService);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    clubIdA = (maxClub._max.clubId ?? 0) + 30_001;
    clubIdB = clubIdA + 1;

    await prisma.club.createMany({
      data: [
        {
          clubId: clubIdA,
          clubName: `instrument-int-A-${clubIdA}`,
          profileImageUrl: null,
        },
        {
          clubId: clubIdB,
          clubName: `instrument-int-B-${clubIdB}`,
          profileImageUrl: null,
        },
      ],
    });
  });

  afterAll(async () => {
    if (!prisma) return;

    if (createdInstrumentIds.length > 0) {
      await prisma.instrument.deleteMany({
        where: { instrumentId: { in: createdInstrumentIds } },
      });
    }

    await prisma.club.deleteMany({
      where: { clubId: { in: [clubIdA, clubIdB] } },
    });

    await disconnectIntegrationTestDatabase(prisma);
  });

  function trackId(instrumentId: number) {
    createdInstrumentIds.push(instrumentId);
    return instrumentId;
  }

  describe('findDetail', () => {
    it('존재하지 않는 instrumentId면 null을 반환한다', async () => {
      const result = await repository.findDetail(9_999_999_999);
      expect(result).toBeNull();
    });

    it('존재하는 악기는 club 포함 모델로 매핑한다', async () => {
      const created = await repository.create(
        createInstrument({
          instrumentId: 0,
          name: '통합-상세',
          instrumentType: 'JANGGU',
          imageUrl: 'https://cdn.test/detail.png',
          borrowAvailable: true,
          club: createInstrumentClub({
            clubId: clubIdA,
            clubName: `instrument-int-A-${clubIdA}`,
          }),
        }),
      );
      trackId(created.instrumentId);

      const found = await repository.findDetail(created.instrumentId);

      expect(found).not.toBeNull();
      expect(found!.instrumentId).toBe(created.instrumentId);
      expect(found!.name).toBe('통합-상세');
      expect(found!.instrumentType).toBe('JANGGU');
      expect(found!.club.clubId).toBe(clubIdA);
      expect(found!.club.clubName).toBe(`instrument-int-A-${clubIdA}`);
    });
  });

  describe('findByIds', () => {
    it('빈 배열이면 빈 배열을 반환한다', async () => {
      await expect(repository.findByIds([])).resolves.toEqual([]);
    });

    it('요청한 id만 club 포함해 반환한다', async () => {
      const a = await repository.create(
        createInstrument({
          instrumentId: 0,
          name: '통합-A',
          instrumentType: 'BUK',
          imageUrl: null,
          borrowAvailable: true,
          club: createInstrumentClub({
            clubId: clubIdA,
            clubName: `instrument-int-A-${clubIdA}`,
          }),
        }),
      );
      const b = await repository.create(
        createInstrument({
          instrumentId: 0,
          name: '통합-B',
          instrumentType: 'SOGO',
          imageUrl: null,
          borrowAvailable: false,
          club: createInstrumentClub({
            clubId: clubIdB,
            clubName: `instrument-int-B-${clubIdB}`,
          }),
        }),
      );
      trackId(a.instrumentId);
      trackId(b.instrumentId);

      const rows = await repository.findByIds([b.instrumentId, a.instrumentId]);

      expect(rows.map((r) => r.instrumentId).sort()).toEqual(
        [a.instrumentId, b.instrumentId].sort(),
      );
      expect(rows.find((r) => r.instrumentId === b.instrumentId)?.name).toBe(
        '통합-B',
      );
    });
  });

  describe('findBorrowableInstruments', () => {
    it('자기 동아리 악기는 제외하고 borrowAvailable=true만 반환한다', async () => {
      const own = await repository.create(
        createInstrument({
          instrumentId: 0,
          name: '자기동아리-대여가능',
          instrumentType: 'JING',
          imageUrl: null,
          borrowAvailable: true,
          club: createInstrumentClub({
            clubId: clubIdA,
            clubName: `instrument-int-A-${clubIdA}`,
          }),
        }),
      );
      const ownUnavailable = await repository.create(
        createInstrument({
          instrumentId: 0,
          name: '자기동아리-대여불가',
          instrumentType: 'KWANGGWARI',
          imageUrl: null,
          borrowAvailable: false,
          club: createInstrumentClub({
            clubId: clubIdA,
            clubName: `instrument-int-A-${clubIdA}`,
          }),
        }),
      );
      const otherBorrowable = await repository.create(
        createInstrument({
          instrumentId: 0,
          name: '타동아리-대여가능',
          instrumentType: 'BUK',
          imageUrl: null,
          borrowAvailable: true,
          club: createInstrumentClub({
            clubId: clubIdB,
            clubName: `instrument-int-B-${clubIdB}`,
          }),
        }),
      );
      trackId(own.instrumentId);
      trackId(ownUnavailable.instrumentId);
      trackId(otherBorrowable.instrumentId);

      const rows = await repository.findBorrowableInstruments(clubIdA, 1, 50);
      const ids = rows.map((r) => r.instrumentId);

      expect(ids).toContain(otherBorrowable.instrumentId);
      expect(ids).not.toContain(own.instrumentId);
      expect(ids).not.toContain(ownUnavailable.instrumentId);
      expect(rows.every((r) => r.borrowAvailable)).toBe(true);
      expect(rows.every((r) => r.club.clubId !== clubIdA)).toBe(true);
    });
  });

  describe('create', () => {
    it('악기를 생성하고 DB에 persist한다', async () => {
      const created = await repository.create(
        createInstrument({
          instrumentId: 0,
          name: '통합-생성',
          instrumentType: 'ELSE',
          imageUrl: null,
          borrowAvailable: true,
          club: createInstrumentClub({
            clubId: clubIdA,
            clubName: `instrument-int-A-${clubIdA}`,
          }),
        }),
      );
      trackId(created.instrumentId);

      const row = await prisma.instrument.findUnique({
        where: { instrumentId: created.instrumentId },
      });
      expect(row?.name).toBe('통합-생성');
      expect(row?.clubId).toBe(clubIdA);
      expect(row?.borrowAvailable).toBe(true);
    });
  });

  describe('update', () => {
    it('스칼라 필드를 갱신한다', async () => {
      const created = await repository.create(
        createInstrument({
          instrumentId: 0,
          name: '통합-수정전',
          instrumentType: 'BUK',
          imageUrl: null,
          borrowAvailable: true,
          club: createInstrumentClub({
            clubId: clubIdA,
            clubName: `instrument-int-A-${clubIdA}`,
          }),
        }),
      );
      trackId(created.instrumentId);

      const updated = await repository.update(
        created.instrumentId,
        createInstrument({
          ...created,
          name: '통합-수정후',
          borrowAvailable: false,
        }),
      );

      expect(updated.name).toBe('통합-수정후');
      expect(updated.borrowAvailable).toBe(false);

      const row = await prisma.instrument.findUnique({
        where: { instrumentId: created.instrumentId },
      });
      expect(row?.name).toBe('통합-수정후');
      expect(row?.borrowAvailable).toBe(false);
    });
  });

  describe('delete', () => {
    it('instrumentId와 clubId가 일치할 때만 삭제한다', async () => {
      const created = await repository.create(
        createInstrument({
          instrumentId: 0,
          name: '통합-삭제',
          instrumentType: 'SOGO',
          imageUrl: null,
          borrowAvailable: true,
          club: createInstrumentClub({
            clubId: clubIdA,
            clubName: `instrument-int-A-${clubIdA}`,
          }),
        }),
      );
      const id = created.instrumentId;

      await repository.delete(id, clubIdB);

      let row = await prisma.instrument.findUnique({
        where: { instrumentId: id },
      });
      expect(row).not.toBeNull();

      await repository.delete(id, clubIdA);

      row = await prisma.instrument.findUnique({ where: { instrumentId: id } });
      expect(row).toBeNull();
    });
  });
});
