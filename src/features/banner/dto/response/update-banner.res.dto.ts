import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateBannerResDto } from './create-banner.res.dto';

export class UpdateBannerResDto extends PartialType(CreateBannerResDto) {
  @ApiProperty({ description: '배너 ID', example: 1 })
  bannerId: number;
}
