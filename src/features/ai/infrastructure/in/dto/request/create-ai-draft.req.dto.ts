import {
  IsArray,
  IsObject,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAiDraftReqDto {
  @ApiProperty({ description: 'BFF가 사용자 JWT 검증 후 전달하는 adminId' })
  @IsString()
  @MinLength(1)
  adminId: string;

  @ApiProperty({
    description: '대화방 UUID. BFF가 새 대화 시작 시 발급합니다.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  roomId: string;

  @ApiProperty({ description: 'Anthropic tool_use id' })
  @IsString()
  @MinLength(1)
  toolUseId: string;

  @ApiProperty({ example: 'reservation_force_delete' })
  @IsString()
  @MinLength(1)
  toolName: string;

  @ApiProperty({ example: { reservationId: 123 } })
  @IsObject()
  args: Record<string, unknown>;

  @ApiProperty({
    description: 'confirm 시 turn 재구성용 assistant content block 원본',
    type: 'array',
    items: { type: 'object' },
  })
  @IsArray()
  pendingAssistantContent: Record<string, unknown>[];

  @ApiProperty({ example: '123번 예약 취소해줘' })
  @IsString()
  pendingUserMessage: string;
}
