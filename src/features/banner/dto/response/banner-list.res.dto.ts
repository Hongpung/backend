import { ApiProperty } from '@nestjs/swagger';
import { BannerResDto } from './banner.res.dto';

export class BannerListResDto {
  @ApiProperty({
    description: '게시 후 배너 목록 (종료된 배너)',
    type: [BannerResDto],
  })
  AfterPost: BannerResDto[];

  @ApiProperty({
    description: '게시 중인 배너 목록 (현재 활성 배너)',
    type: [BannerResDto],
  })
  OnPost: BannerResDto[];

  @ApiProperty({
    description: '게시 전 배너 목록 (예정된 배너)',
    type: [BannerResDto],
  })
  BeforePost: BannerResDto[];
}
