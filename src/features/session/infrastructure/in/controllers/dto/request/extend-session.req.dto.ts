import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class ExtendSessionReqDto {
  @ApiProperty({
    description: '연장할 런타임 세션 ID (체크인·세션 목록과 동일한 UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsUUID('4')
  sessionId: string;
}
