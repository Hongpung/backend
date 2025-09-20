import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class LogoutReqDto {
  @ApiProperty({
    description: '리프레시 토큰 원문 — 제공 시 해당 세션만 폐기',
    required: false,
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiProperty({
    description: '액세스 토큰 sid와 다른 디바이스 기준 폐기 시 사용',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiProperty({
    description:
      'false면 Expo 푸시 토큰(notificationToken)은 유지하고 세션만 폐기합니다. 기본값은 true입니다.',
    required: false,
    default: true,
  })
  @Transform(({ value }) => value ?? true)
  @IsOptional()
  @IsBoolean()
  clearPushTokens = true;
}
