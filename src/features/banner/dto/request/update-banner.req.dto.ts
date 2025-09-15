import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateBannerReqDto } from './create-banner.req.dto';
import { IsNumber } from 'class-validator';

export class UpdateBannerReqDto extends PartialType(CreateBannerReqDto) {
  @ApiProperty({ description: '배너 ID', example: 1 })
  @IsNumber()
  bannerId: number;
}
