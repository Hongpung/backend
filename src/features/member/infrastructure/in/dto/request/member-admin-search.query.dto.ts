import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MemberAdminSearchQueryDto {
  @ApiPropertyOptional({ description: '이름으로 검색' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: '동아리 ID (0 포함, DB에 clubId=0인 동아리 조회 가능)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  clubId?: number;

  @ApiPropertyOptional({ description: '역할 (한국어)' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: '페이지 (0-based, 기본 0)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page?: number;

  @ApiPropertyOptional({
    description: '페이지 크기 (20|40|80, 기본 20)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number;
}
