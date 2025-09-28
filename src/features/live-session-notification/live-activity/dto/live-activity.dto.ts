import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type { LiveActivityInfo } from '../application/live-activity.model';

export class RegisterLiveActivityDto {
  @ApiProperty({ description: '세션 ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'APNs 디바이스 토큰' })
  @IsString()
  apnsToken: string;
}

export class UpdateLiveActivityDto {
  @ApiProperty({ description: '세션 ID (예약 ID 또는 문자열 세션 식별자)' })
  @IsNotEmpty()
  sessionId: number | string;

  @ApiProperty({ description: '이벤트 타입', required: false })
  @IsOptional()
  @IsString()
  event?: 'update';

  @ApiProperty({
    description:
      'Live Activity content-state (update 시 위젯이 통째로 교체되므로 timerStartDateInMilliseconds / timerEndDateInMilliseconds 등 필요한 필드를 모두 포함)',
  })
  @IsObject()
  contentState: Record<string, unknown>;
}
