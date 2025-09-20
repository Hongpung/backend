import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponseDto } from './notification-response.dto';

/**
 * 알림 목록 Response DTO
 */
export class NotificationListResponseDto {
  @ApiProperty({
    description: '알림 목록',
    type: [NotificationResponseDto],
  })
  notifications: NotificationResponseDto[];
}
