import { ApiProperty } from '@nestjs/swagger';

export class AiUsageCheckResDto {
  @ApiProperty({ example: true })
  allowed: boolean;

  @ApiProperty({ example: 12 })
  used: number;

  @ApiProperty({ example: 500 })
  limit: number;

  @ApiProperty({ enum: ['month'], example: 'month' })
  period: 'month';

  @ApiProperty({
    example: '2026-08-01T00:00:00.000+09:00',
    description: 'KST 기준 다음 달 1일 00:00',
  })
  resetAt: string;
}
