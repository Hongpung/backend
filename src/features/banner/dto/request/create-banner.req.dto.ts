import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateBannerReqDto {
  @ApiProperty({
    description: '배너 소유자',
    example: '홍익대학교 컴퓨터공학과',
  })
  @IsString()
  owner: string;

  @ApiProperty({
    description: '배너 이미지 URL',
    example: 'https://example.com/banner.jpg',
  })
  @IsString()
  bannerImgUrl: string;

  @ApiProperty({
    description: '배너 링크 URL',
    example: 'https://example.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  href?: string;

  @ApiProperty({ description: '게시 시작일', example: '2024-01-01' })
  @IsDateString(
    { strict: true },
    { message: 'startDate must be a valid ISO 8601 date string' },
  )
  startDate: string;

  @ApiProperty({ description: '게시 종료일', example: '2024-01-31' })
  @IsDateString(
    { strict: true },
    { message: 'endDate must be a valid ISO 8601 date string' },
  )
  endDate: string;
}
