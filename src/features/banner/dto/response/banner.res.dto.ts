import { ApiProperty } from '@nestjs/swagger';

export class BannerResDto {
  @ApiProperty({ description: '배너 ID', example: 1 })
  bannerId: number;

  @ApiProperty({
    description: '배너 소유자',
    example: '홍익대학교 컴퓨터공학과',
  })
  owner: string;

  @ApiProperty({
    description: '배너 이미지 URL',
    example: 'https://example.com/banner.jpg',
  })
  bannerImgUrl: string;

  @ApiProperty({
    description: '배너 링크 URL',
    example: 'https://example.com',
    required: false,
  })
  href?: string;

  @ApiProperty({
    description: '게시 시작일',
    example: '2024-01-01T00:00:00.000Z',
  })
  startDate: Date;

  @ApiProperty({
    description: '게시 종료일',
    example: '2024-01-31T23:59:59.000Z',
  })
  endDate: Date;
}
