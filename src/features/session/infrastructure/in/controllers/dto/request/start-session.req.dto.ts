import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class StartSessionReqDto {
  @ApiPropertyOptional({
    description: '참여 가능 여부 설정 여부',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  participationAvailable?: boolean;
}
