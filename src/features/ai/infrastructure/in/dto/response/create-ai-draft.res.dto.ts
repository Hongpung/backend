import { ApiProperty } from '@nestjs/swagger';

export class CreateAiDraftResDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  draftId: string;

  @ApiProperty({ enum: ['PENDING'], example: 'PENDING' })
  status: 'PENDING';

  @ApiProperty({ example: '2026-07-03T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-07-04T12:00:00.000Z' })
  expiresAt: string;
}
