import { ApiProperty } from '@nestjs/swagger';

/**
 * 알림 정보 Response DTO
 */
export class NotificationResponseDto {
  @ApiProperty({ description: '알림 ID', example: 1 })
  notificationId: number;

  @ApiProperty({ description: '회원 ID', example: 1 })
  memberId: number;

  @ApiProperty({
    description: '알림 생성 시간 (KST 벽시각)',
    example: '2026-05-09T09:00',
  })
  timestamp: string;

  @ApiProperty({ description: '읽음 여부', example: false })
  isRead: boolean;

  @ApiProperty({
    description: '알림 데이터',
    example: { title: '새로운 알림', body: '알림 내용입니다.' },
  })
  data: any;
}
