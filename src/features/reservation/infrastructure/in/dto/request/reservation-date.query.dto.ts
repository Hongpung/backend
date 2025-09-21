import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReservationDateQueryDto {
  @ApiProperty({
    example: '2026-04-01',
    description: '조회할 날짜 (YYYY-MM-DD)',
  })
  @IsDateString()
  date: string;
}
