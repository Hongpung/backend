import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMemberByAdminReqDto {
  @ApiPropertyOptional({ description: '닉네임', nullable: true })
  @IsOptional()
  @IsString()
  nickname?: string | null;

  @ApiPropertyOptional({ description: '이름(실명)' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    description:
      '소속 동아리 ID (필드를 보내지 않으면 유지, null이면 미소속, 0 포함)',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  clubId?: number | null;

  @ApiPropertyOptional({
    description: '로그인 아이디(이메일). 변경 시 관리자 비밀번호 필요',
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description:
      '동아리 또는 이메일을 실제로 바꿀 때 필수. 현재 로그인한 관리자 비밀번호',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  adminPassword?: string;
}
