import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveAiDraftResDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  draftId: string;

  @ApiProperty({ enum: ['EXECUTED', 'REJECTED'] })
  status: 'EXECUTED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'approve 시 도메인 실행 결과' })
  result?: unknown;

  @ApiProperty({ example: '2026-07-03T12:05:00.000Z' })
  resolvedAt: string;
}

export class ResolveAiDraftConflictResDto {
  @ApiProperty({ enum: ['ALREADY_RESOLVED'], example: 'ALREADY_RESOLVED' })
  error: 'ALREADY_RESOLVED';

  @ApiProperty({ enum: ['EXECUTED', 'REJECTED'] })
  status: 'EXECUTED' | 'REJECTED';
}
