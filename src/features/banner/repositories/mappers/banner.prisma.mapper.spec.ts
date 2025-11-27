import { describe, expect, it } from '@jest/globals';
import { Prisma } from '@prisma/client';
import type { Banner as PrismaBanner } from '@prisma/client';
import { createBanner } from '../../models/banner.model';
import { BannerRepositoryMapper } from './banner.prisma.mapper';

function prismaRow(overrides: Partial<PrismaBanner> = {}): PrismaBanner {
  return {
    bannerId: 10,
    owner: 'club-a',
    bannerImgUrl: 'https://cdn.example/b.jpg',
    href: 'https://link.example',
    startDate: new Date('2024-01-01T00:00:00.000Z'),
    endDate: new Date('2024-01-31T23:59:59.999Z'),
    ...overrides,
  } as PrismaBanner;
}

describe('BannerRepositoryMapper', () => {
  describe('toModel', () => {
    it('Prisma 레코드를 배너 모델로 변환한다', () => {
      const row = prismaRow({ bannerId: 99 });
      const banner = BannerRepositoryMapper.toModel(row);

      expect(banner.bannerId).toBe(99);
      expect(banner.owner).toBe(row.owner);
      expect(banner.bannerImgUrl).toBe(row.bannerImgUrl);
      expect(banner.href).toBe(row.href);
      expect(banner.startDate).toEqual(row.startDate);
      expect(banner.endDate).toEqual(row.endDate);
    });

    it('href가 null이어도 모델로 매핑한다', () => {
      const banner = BannerRepositoryMapper.toModel(prismaRow({ href: null }));

      expect(banner.href).toBeNull();
    });

    it('toModelArray는 레코드 배열을 모델 배열로 변환한다', () => {
      const rows = [prismaRow({ bannerId: 1 }), prismaRow({ bannerId: 2 })];
      const banners = BannerRepositoryMapper.toModelArray(rows);

      expect(banners).toHaveLength(2);
      expect(banners[0].bannerId).toBe(1);
      expect(banners[1].bannerId).toBe(2);
    });
  });

  describe('toCreatePersistenceData', () => {
    it('모델 필드를 BannerCreateInput 형태로 만든다', () => {
      const banner = createBanner({
        owner: 'o',
        bannerImgUrl: 'u',
        href: 'https://h.example',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-31'),
      });

      expect(BannerRepositoryMapper.toCreatePersistenceData(banner)).toEqual({
        owner: 'o',
        bannerImgUrl: 'u',
        href: 'https://h.example',
        startDate: banner.startDate,
        endDate: banner.endDate,
      });
    });

    it('href가 null이면 persistence에도 null을 넣는다', () => {
      const banner = createBanner({
        owner: 'o',
        bannerImgUrl: 'u',
        href: null,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-31'),
      });

      expect(
        BannerRepositoryMapper.toCreatePersistenceData(banner).href,
      ).toBeNull();
    });
  });

  describe('toUpdatePersistenceData', () => {
    it('값이 채워진 모델은 각 필드를 업데이트 입력으로 넘긴다', () => {
      const banner = createBanner({
        bannerId: 1,
        owner: 'x',
        bannerImgUrl: 'y',
        href: 'z',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-04-30'),
      });

      const data = BannerRepositoryMapper.toUpdatePersistenceData(banner);

      expect(data.owner).toBe('x');
      expect(data.bannerImgUrl).toBe('y');
      expect(data.href).toBe('z');
      expect(data.startDate).toEqual(banner.startDate);
      expect(data.endDate).toEqual(banner.endDate);
    });

    it('href가 null이면 Prisma.skip으로 처리되어 해당 필드를 건너뛴다', () => {
      const banner = createBanner({
        bannerId: 1,
        owner: 'o',
        bannerImgUrl: 'u',
        href: null,
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-04-30'),
      });

      expect(BannerRepositoryMapper.toUpdatePersistenceData(banner).href).toBe(
        Prisma.skip,
      );
    });

    it('필드가 undefined인 모델(형 단언)은 해당 키마다 Prisma.skip을 사용한다', () => {
      const sparse = {
        bannerId: 1,
        owner: undefined,
        bannerImgUrl: undefined,
        href: undefined,
        startDate: undefined,
        endDate: undefined,
      } as unknown as ReturnType<typeof createBanner>;

      expect(BannerRepositoryMapper.toUpdatePersistenceData(sparse)).toEqual({
        owner: Prisma.skip,
        bannerImgUrl: Prisma.skip,
        href: Prisma.skip,
        startDate: Prisma.skip,
        endDate: Prisma.skip,
      });
    });
  });
});
