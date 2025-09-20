import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RefreshTokensReqDto {
  @ApiProperty({ description: '리프레시 토큰 원문' })
  @IsString()
  refreshToken: string;

  @ApiProperty({
    description: '앱 디바이스 UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  deviceId: string;

  @ApiProperty({
    description: '표시용 기기 이름',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
