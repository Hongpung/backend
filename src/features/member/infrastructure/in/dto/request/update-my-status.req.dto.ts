import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class UpdateMyStatusReqDto {
  @ApiProperty({ description: '프로필 이미지 URL', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUrl()
  profileImageUrl?: string | null;

  @ApiProperty({ description: '닉네임', nullable: true })
  @IsOptional()
  @IsString()
  nickname?: string | null;

  @ApiProperty({ description: '인스타그램 URL', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUrl()
  instagramUrl?: string | null;

  @ApiProperty({ description: '블로그 URL', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUrl()
  blogUrl?: string | null;
}
