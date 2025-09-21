import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReservationTermQueryDto {
  @ApiProperty({
    name: 'start-date',
    example: '2026-04-01',
    description: '시작 날짜 (YYYY-MM-DD)',
  })
  @IsDateString()
  'start-date': string;

  @ApiProperty({
    name: 'end-date',
    example: '2026-04-30',
    description: '종료 날짜 (YYYY-MM-DD)',
  })
  @IsDateString()
  'end-date': string;
}
