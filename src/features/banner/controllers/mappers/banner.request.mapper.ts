import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import type {
  CreateBannerParams,
  UpdateBannerParams,
} from '../../models/banner.commands';
import type { CreateBannerReqDto } from '../../dto/request/create-banner.req.dto';
import type { UpdateBannerReqDto } from '../../dto/request/update-banner.req.dto';

export class BannerRequestMapper {
  static toCreateParams(dto: CreateBannerReqDto): CreateBannerParams {
    return {
      owner: dto.owner,
      bannerImgUrl: dto.bannerImgUrl,
      href: dto.href ?? null,
      startDate: AppKstDateTime.dateFormmatForDB(dto.startDate),
      endDate: AppKstDateTime.dateFormmatForDB(dto.endDate),
    };
  }

  static toUpdateParams(dto: UpdateBannerReqDto): UpdateBannerParams {
    return {
      owner: dto.owner,
      bannerImgUrl: dto.bannerImgUrl,
      href: dto.href,
      startDate: dto.startDate
        ? AppKstDateTime.dateFormmatForDB(dto.startDate)
        : undefined,
      endDate: dto.endDate
        ? AppKstDateTime.dateFormmatForDB(dto.endDate)
        : undefined,
    };
  }
}
