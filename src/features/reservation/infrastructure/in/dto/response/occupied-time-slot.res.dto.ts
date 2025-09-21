import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OccupiedSlotCreatorResDto {
  @ApiProperty()
  name: string;
}

/** 특정 일자 점유 시간 슬롯 (예약 요약) */
export class OccupiedTimeSlotResDto {
  @ApiPropertyOptional({ type: OccupiedSlotCreatorResDto, nullable: true })
  creator?: OccupiedSlotCreatorResDto | null;

  @ApiPropertyOptional({ nullable: true })
  externalCreatorName?: string | null;

  @ApiProperty()
  title: string;

  @ApiProperty()
  reservationType: string;

  @ApiProperty()
  reservationId: number;

  @ApiProperty({ description: '시작 시각 (HH:mm)' })
  startTime: string;

  @ApiProperty({ description: '종료 시각 (HH:mm)' })
  endTime: string;
}
