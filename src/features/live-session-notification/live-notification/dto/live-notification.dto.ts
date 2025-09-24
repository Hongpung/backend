import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type { LiveNotificationInfo } from '../application/live-notification.model';

export class RegisterLiveNotificationDto {
  @ApiProperty({ description: '세션 ID' })
  @IsString()
  sessionId: string;
}

export class SendLiveNotificationDto {
  @ApiProperty({ description: '세션 ID (숫자 또는 문자열 식별자)' })
  @IsNotEmpty()
  sessionId: number | string;

  @ApiProperty({
    description: '액션 타입',
    enum: ['SESSION_EXTEND', 'SESSION_END'],
  })
  @IsEnum(['SESSION_EXTEND', 'SESSION_END'])
  action: 'SESSION_EXTEND' | 'SESSION_END';

  @ApiProperty({
    description: '종료 시간 (SESSION_EXTEND에만 필요)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  endTime?: number;
}
