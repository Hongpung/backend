import { ApiProperty } from '@nestjs/swagger';

/**
 * 메시지 Response DTO
 */
export class MessageResponseDto {
  @ApiProperty({
    description: '응답 메시지',
    example: 'Read all success',
  })
  message: string;
}
