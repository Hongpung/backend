import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateNotificationTokenReqDto {
  @ApiProperty({
    description:
      'Expo 푸시 알림 토큰 (v1 호환: pushEnable만 보낼 때는 생략 가능)',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: '알림 토큰은 비어 있을 수 없습니다.' })
  notificationToken?: string;

  @ApiProperty({
    description:
      '푸시 알림 수신 여부 (토큰 등록 시 기본값 true, v1 호환: 단독 전송 가능)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  pushEnable?: boolean;
}
