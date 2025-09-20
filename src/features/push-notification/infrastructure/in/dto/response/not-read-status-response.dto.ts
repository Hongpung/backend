import { ApiProperty } from '@nestjs/swagger';

/**
 * 읽지 않은 알림 상태 Response DTO
 */
export class NotReadStatusResponseDto {
  @ApiProperty({
    description: '읽지 않은 알림 존재 여부',
    example: true,
  })
  status: boolean;
}
