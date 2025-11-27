import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { BannerAdminService } from './banner-admin.service';
import { BannerMemberService } from './banner-member.service';
import { BannerRepository } from '../repositories/banner.repository';
import { createBanner } from '../models/banner.model';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

/** MySQL @db.Date — UTC 자정 기준 */
const utcDate = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day));

const ymdToUtcDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return utcDate(y, m, d);
};

const addDaysToYmd = (ymd: string, days: number) => {
  const base = ymdToUtcDate(ymd);
  base.setUTCDate(base.getUTCDate() + days);
  return AppKstDateTime.kstCalendarYmdFromDbOrString(base);
};

describeIntegration('BannerAdminService (통합)', () => {
  let prisma: PrismaClient;
  let repository: BannerRepository;
  let service: BannerAdminService;

  const ownerPrefix = `banner-admin-svc-int-${Date.now()}`;
  const createdIds: number[] = [];

  let endedId: number;
  let onPostId: number;
  let futureId: number;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();

    repository = new BannerRepository(prisma as unknown as PrismaService);
    const memberService = new BannerMemberService(repository);
    service = new BannerAdminService(memberService, repository);

    const todayYmd = AppKstDateTime.kstTodayYmd();
    const tomorrowYmd = AppKstDateTime.kstTomorrowYmd();
    const yesterdayYmd = addDaysToYmd(todayYmd, -1);
    const dayAfterTomorrowYmd = addDaysToYmd(tomorrowYmd, 1);

    const ended = await repository.create(
      createBanner({
        owner: `${ownerPrefix}-ended`,
        bannerImgUrl: 'https://cdn.test/ended.png',
        href: null,
        startDate: ymdToUtcDate(addDaysToYmd(todayYmd, -30)),
        endDate: ymdToUtcDate(yesterdayYmd),
      }),
    );
    endedId = ended.bannerId!;
    createdIds.push(endedId);

    const onPost = await repository.create(
      createBanner({
        owner: `${ownerPrefix}-onpost`,
        bannerImgUrl: 'https://cdn.test/onpost.png',
        href: null,
        startDate: ymdToUtcDate(todayYmd),
        endDate: ymdToUtcDate(addDaysToYmd(tomorrowYmd, 7)),
      }),
    );
    onPostId = onPost.bannerId!;
    createdIds.push(onPostId);

    const future = await repository.create(
      createBanner({
        owner: `${ownerPrefix}-future`,
        bannerImgUrl: 'https://cdn.test/future.png',
        href: null,
        startDate: ymdToUtcDate(dayAfterTomorrowYmd),
        endDate: ymdToUtcDate(addDaysToYmd(dayAfterTomorrowYmd, 30)),
      }),
    );
    futureId = future.bannerId!;
    createdIds.push(futureId);
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

  describe('findAll', () => {
    it('afterPost·onPost·beforePost 버킷에 올바른 배너 ID만 포함된다', async () => {
      const result = await service.findAll();

      const afterIds = result.afterPost
        .filter((b) => b.owner.startsWith(ownerPrefix))
        .map((b) => b.bannerId);
      const onIds = result.onPost
        .filter((b) => b.owner.startsWith(ownerPrefix))
        .map((b) => b.bannerId);
      const beforeIds = result.beforePost
        .filter((b) => b.owner.startsWith(ownerPrefix))
        .map((b) => b.bannerId);

      expect(afterIds).toContain(endedId);
      expect(afterIds).not.toContain(onPostId);
      expect(afterIds).not.toContain(futureId);

      expect(onIds).toContain(onPostId);
      expect(onIds).not.toContain(endedId);
      expect(onIds).not.toContain(futureId);

      expect(beforeIds).toContain(futureId);
      expect(beforeIds).not.toContain(endedId);
      expect(beforeIds).not.toContain(onPostId);
    });
  });

  describe('update', () => {
    it('배너가 없으면 NotFoundException이다', async () => {
      await expect(
        service.update(9_999_999, { owner: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('부분 필드만 갱신하고 나머지는 DB에 유지된다', async () => {
      const startDate = utcDate(2025, 3, 1);
      const endDate = utcDate(2025, 3, 31);
      const expectedStartYmd =
        AppKstDateTime.kstCalendarYmdFromDbOrString(startDate);
      const expectedEndYmd =
        AppKstDateTime.kstCalendarYmdFromDbOrString(endDate);

      const created = await repository.create(
        createBanner({
          owner: `${ownerPrefix}-merge-before`,
          bannerImgUrl: 'https://cdn.test/merge-before.png',
          href: 'https://link.before.test',
          startDate,
          endDate,
        }),
      );
      createdIds.push(created.bannerId!);

      await service.update(created.bannerId!, {
        owner: `${ownerPrefix}-merge-after`,
      });

      const row = await prisma.banner.findUnique({
        where: { bannerId: created.bannerId },
      });

      expect(row?.owner).toBe(`${ownerPrefix}-merge-after`);
      expect(row?.bannerImgUrl).toBe('https://cdn.test/merge-before.png');
      expect(row?.href).toBe('https://link.before.test');
      expect(
        AppKstDateTime.kstCalendarYmdFromDbOrString(row!.startDate),
      ).toBe(expectedStartYmd);
      expect(AppKstDateTime.kstCalendarYmdFromDbOrString(row!.endDate)).toBe(
        expectedEndYmd,
      );
    });
  });

  describe('remove', () => {
    it('배너가 없으면 NotFoundException이다', async () => {
      await expect(service.remove(9_999_999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
