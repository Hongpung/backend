import { IsIn, IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveAiDraftReqDto {
  @ApiProperty({ description: 'BFF가 사용자 JWT 검증 후 전달하는 adminId' })
  @IsString()
  @MinLength(1)
  adminId: string;

  @ApiProperty({
    description: 'draft가 속한 대화방 UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  roomId: string;

  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @ApiPropertyOptional({ description: 'approve 시 수정된 tool args' })
  @IsOptional()
  @IsObject()
  editedArgs?: Record<string, unknown>;
}
