import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ExtendSessionReqDto {
  @ApiPropertyOptional({
    description:
      '연장할 런타임 세션 ID (v1 호환: 생략 시 현재 ONAIR 세션)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  sessionId?: string;
}
