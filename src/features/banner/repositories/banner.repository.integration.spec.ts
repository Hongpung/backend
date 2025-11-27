import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import { BannerRepository } from './banner.repository';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { createBanner } from '../models/banner.model';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

/** MySQL @db.Date — UTC 자정 기준 */
const utcDate = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day));

describeIntegration('BannerRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: BannerRepository;
  const createdIds: number[] = [];
  const ownerPrefix = `banner-repo-int-${Date.now()}`;

  let endedId: number;
  let futureId: number;
  let juneId: number;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new BannerRepository(prisma as unknown as PrismaService);

    const ended = await repository.create(
      createBanner({
        owner: `${ownerPrefix}-ended`,
        bannerImgUrl: 'https://cdn.test/ended.png',
        href: 'https://ended.test',
        startDate: utcDate(2020, 1, 1),
        endDate: utcDate(2020, 12, 31),
      }),
    );
    endedId = ended.bannerId!;
    createdIds.push(endedId);

    const future = await repository.create(
      createBanner({
        owner: `${ownerPrefix}-future`,
        bannerImgUrl: 'https://cdn.test/future.png',
        href: null,
        startDate: utcDate(2030, 1, 1),
        endDate: utcDate(2030, 12, 31),
      }),
    );
    futureId = future.bannerId!;
    createdIds.push(futureId);

    const june = await repository.create(
      createBanner({
        owner: `${ownerPrefix}-june`,
        bannerImgUrl: 'https://cdn.test/june.png',
        href: null,
        startDate: utcDate(2024, 6, 1),
        endDate: utcDate(2024, 6, 30),
      }),
    );
    juneId = june.bannerId!;
    createdIds.push(juneId);
  });

  afterAll(async () => {
    if (!prisma) return;

    if (createdIds.length > 0) {
      await prisma.banner.deleteMany({
        where: { bannerId: { in: createdIds } },
      });
    }

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('findById', () => {
    it('존재하지 않는 bannerId면 null을 반환한다', async () => {
      const result = await repository.findById(9_999_999_999);
      expect(result).toBeNull();
    });

    it('존재하는 bannerId면 모델로 매핑해 반환한다', async () => {
      const found = await repository.findById(endedId);

      expect(found).not.toBeNull();
      expect(found!.bannerId).toBe(endedId);
      expect(found!.owner).toBe(`${ownerPrefix}-ended`);
      expect(found!.href).toBe('https://ended.test');
      expect(found!.startDate).toEqual(utcDate(2020, 1, 1));
      expect(found!.endDate).toEqual(utcDate(2020, 12, 31));
    });
  });

  describe('create', () => {
    it('배너를 생성하고 DB에 persist한다', async () => {
      const owner = `${ownerPrefix}-create`;
      const created = await repository.create(
        createBanner({
          owner,
          bannerImgUrl: 'https://cdn.test/new.png',
          href: null,
          startDate: utcDate(2025, 3, 1),
          endDate: utcDate(2025, 3, 31),
        }),
      );
      createdIds.push(created.bannerId!);

      const row = await prisma.banner.findUnique({
        where: { bannerId: created.bannerId },
      });
      expect(row?.owner).toBe(owner);
      expect(row?.href).toBeNull();
    });
  });

  describe('update', () => {
    it('owner 필드를 갱신한다', async () => {
      const created = await repository.create(
        createBanner({
          owner: `${ownerPrefix}-update-before`,
          bannerImgUrl: 'https://cdn.test/u.png',
          href: 'https://before.test',
          startDate: utcDate(2025, 1, 1),
          endDate: utcDate(2025, 1, 31),
        }),
      );
      createdIds.push(created.bannerId!);

      const updated = await repository.update(
        created.bannerId!,
        createBanner({
          ...created,
          owner: `${ownerPrefix}-update-after`,
        }),
      );

      expect(updated.owner).toBe(`${ownerPrefix}-update-after`);

      const row = await prisma.banner.findUnique({
        where: { bannerId: created.bannerId },
      });
      expect(row?.owner).toBe(`${ownerPrefix}-update-after`);
    });
  });

  describe('delete', () => {
    it('배너를 삭제한다', async () => {
      const created = await repository.create(
        createBanner({
          owner: `${ownerPrefix}-delete`,
          bannerImgUrl: 'https://cdn.test/d.png',
          href: null,
          startDate: utcDate(2025, 2, 1),
          endDate: utcDate(2025, 2, 28),
        }),
      );
      const id = created.bannerId!;

      await repository.delete(id);

      const row = await prisma.banner.findUnique({ where: { bannerId: id } });
      expect(row).toBeNull();
    });
  });

  describe('findByDateConditions', () => {
    it('endDateBefore 조건으로 종료된 배너만 조회한다', async () => {
      const rows = await repository.findByDateConditions({
        endDateBefore: utcDate(2024, 1, 1),
      });

      const ids = rows.map((b) => b.bannerId);
      expect(ids).toContain(endedId);
      expect(ids).not.toContain(futureId);
      expect(ids).not.toContain(juneId);
    });

    it('startDateAfter 조건으로 예정 배너만 조회한다', async () => {
      const rows = await repository.findByDateConditions({
        startDateAfter: utcDate(2029, 12, 31),
      });

      const ids = rows.map((b) => b.bannerId);
      expect(ids).toContain(futureId);
      expect(ids).not.toContain(endedId);
      expect(ids).not.toContain(juneId);
    });

    it('startDateBefore·endDateAfter 조합으로 기간 중 배너를 조회한다', async () => {
      const rows = await repository.findByDateConditions({
        startDateBefore: utcDate(2024, 7, 1),
        endDateAfter: utcDate(2024, 6, 1),
      });

      const ids = rows.map((b) => b.bannerId);
      expect(ids).toContain(juneId);
      expect(ids).not.toContain(endedId);
      expect(ids).not.toContain(futureId);
    });
  });

  describe('findAll', () => {
    it('startDate 내림차순으로 반환한다', async () => {
      const rows = await repository.findAll();
      const ours = rows.filter((b) => b.owner.startsWith(ownerPrefix));
      const dates = ours.map((b) => b.startDate.getTime());

      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });
  });

  describe('findByOwner', () => {
    it('owner로 필터링해 startDate 내림차순으로 반환한다', async () => {
      const owner = `${ownerPrefix}-ended`;
      const rows = await repository.findByOwner(owner);

      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows.every((b) => b.owner === owner)).toBe(true);
      expect(rows[0]!.bannerId).toBe(endedId);
    });
  });
});
