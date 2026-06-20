import {
  IsArray,
  IsIn,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class AiTurnDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  content: Record<string, unknown>[];
}

export class SaveAiTurnsReqDto {
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

  @ApiProperty({ type: [AiTurnDto] })
  @IsArray()
  turns: AiTurnDto[];
}
