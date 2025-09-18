import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MemberInviteSearchQueryDto {
  @ApiPropertyOptional({ description: '이름으로 검색' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: '동아리 ID (복수 가능)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  @IsArray()
  @IsString({ each: true })
  clubId?: string[];

  @ApiPropertyOptional({ description: '최소 학번' })
  @IsOptional()
  @IsString()
  minEnrollmentNumber?: string;

  @ApiPropertyOptional({ description: '최대 학번' })
  @IsOptional()
  @IsString()
  maxEnrollmentNumber?: string;
}
