import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateNotificationTokenReqDto {
  @ApiProperty({
    description: 'Expo 푸시 알림 토큰',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsString()
  @MinLength(1, { message: '알림 토큰은 필수입니다.' })
  notificationToken: string;

  @ApiProperty({
    description: '푸시 알림 수신 여부 (기본값: true)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  pushEnable?: boolean;
}
