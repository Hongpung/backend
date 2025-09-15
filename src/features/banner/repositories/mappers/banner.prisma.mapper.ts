import { Banner as PrismaBanner, Prisma } from '@prisma/client';
import { createBanner, type Banner } from '../../models/banner.model';

export class BannerRepositoryMapper {
  static toModel(prismaData: PrismaBanner): Banner {
    return createBanner({
      bannerId: prismaData.bannerId,
      owner: prismaData.owner,
      bannerImgUrl: prismaData.bannerImgUrl,
      href: prismaData.href,
      startDate: prismaData.startDate,
      endDate: prismaData.endDate,
    });
  }

  static toModelArray(prismaDataArray: PrismaBanner[]): Banner[] {
    return prismaDataArray.map((prismaData) => this.toModel(prismaData));
  }

  static toCreatePersistenceData(banner: Banner): Prisma.BannerCreateInput {
    return {
      owner: banner.owner,
      bannerImgUrl: banner.bannerImgUrl,
      href: banner.href ?? null,
      startDate: banner.startDate,
      endDate: banner.endDate,
    };
  }

  static toUpdatePersistenceData(banner: Banner): Prisma.BannerUpdateInput {
    return {
      owner: banner.owner ?? Prisma.skip,
      bannerImgUrl: banner.bannerImgUrl ?? Prisma.skip,
      href: banner.href ?? Prisma.skip,
      startDate: banner.startDate ?? Prisma.skip,
      endDate: banner.endDate ?? Prisma.skip,
    };
  }
}
