import {
  type Banner,
} from '../../models/banner.model';
import {
  BannerResDto,
  BannerListResDto,
  CreateBannerResDto,
  UpdateBannerResDto,
  DeleteBannerResDto,
} from '../../dto/response';

export class BannerResponseMapper {
  static toDto(banner: Banner): BannerResDto {
    return {
      bannerId: banner.bannerId!,
      owner: banner.owner,
      bannerImgUrl: banner.bannerImgUrl,
      href: banner.href ?? undefined,
      startDate: banner.startDate,
      endDate: banner.endDate,
    };
  }

  static toDtoArray(banners: Banner[]): BannerResDto[] {
    return banners.map((banner) => this.toDto(banner));
  }

  static toCreateResDto(
    banner: Banner,
    message = '배너 생성이 완료되었습니다.',
  ): CreateBannerResDto {
    return {
      bannerId: banner.bannerId!,
      owner: banner.owner,
      bannerImgUrl: banner.bannerImgUrl,
      href: banner.href ?? undefined,
      startDate: banner.startDate,
      endDate: banner.endDate,
      message,
    };
  }

  static toUpdateResDto(
    banner: Banner,
    message = '배너 수정이 완료되었습니다.',
  ): UpdateBannerResDto {
    return {
      bannerId: banner.bannerId!,
      owner: banner.owner,
      bannerImgUrl: banner.bannerImgUrl,
      href: banner.href ?? undefined,
      startDate: banner.startDate,
      endDate: banner.endDate,
      message,
    };
  }

  static toDeleteResDto(
    message = '배너 삭제가 완료되었습니다.',
  ): DeleteBannerResDto {
    return { message };
  }

  static toListResDto(
    afterPost: Banner[],
    onPost: Banner[],
    beforePost: Banner[],
  ): BannerListResDto {
    return {
      AfterPost: this.toDtoArray(afterPost),
      OnPost: this.toDtoArray(onPost),
      BeforePost: this.toDtoArray(beforePost),
    };
  }
}
