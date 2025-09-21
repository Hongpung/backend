import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RESERVATION_TYPES,
  ReservationType,
} from 'src/features/reservation/reservation.types';
import {
  IsArray,
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

type BatchReservationOptions<T extends ReservationType> = {
  title: string;
  reservationType: T;
} & (T extends 'EXTERNAL'
  ? { creatorName: string; creatorId?: undefined }
  : { creatorName?: undefined; creatorId: number });

class DateDetailsDTO {
  @ApiProperty({
    description: '요일',
    enum: ['월', '화', '수', '목', '금', '토', '일'],
    example: '월',
  })
  @IsString()
  @IsIn(['월', '화', '수', '목', '금', '토', '일'])
  day: string;

  @ApiProperty({ description: '시작 시간 (HH:mm)', example: '19:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: '종료 시간 (HH:mm)', example: '21:00' })
  @IsString()
  endTime: string;
}

class DurationDTO {
  @ApiProperty({ description: '시작 날짜 (YYYY-MM-DD)', example: '2026-05-01' })
  @IsString()
  startDate: string;

  @ApiProperty({ description: '종료 날짜 (YYYY-MM-DD)', example: '2026-05-31' })
  @IsString()
  endDate: string;
}

class BatchReservationOptionDTO {
  @ApiProperty({ description: '예약 제목', example: '정기 연습' })
  @IsString()
  title: string;

  @ApiProperty({
    description: '예약 타입',
    enum: RESERVATION_TYPES,
    example: 'REGULAR',
  })
  @IsString()
  reservationType: ReservationType;

  @ApiPropertyOptional({ description: '외부 생성자 이름', example: '외부인' })
  @IsOptional()
  @IsString()
  creatorName?: string;

  @ApiPropertyOptional({ description: '생성자 ID', example: 123 })
  @IsOptional()
  @IsDefined()
  creatorId?: number;
}
export class BatchReservtionDTO<T extends ReservationType> {
  @ApiProperty({
    description: '요일별 예약 시간 목록',
    type: [DateDetailsDTO],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateDetailsDTO)
  dayTimes: { day: string; startTime: string; endTime: string }[];

  @ApiProperty({ description: '예약 기간', type: DurationDTO })
  @ValidateNested()
  @Type(() => DurationDTO)
  duration: { startDate: string; endDate: string };

  @ApiProperty({
    description: '일괄 예약 옵션',
    type: BatchReservationOptionDTO,
  })
  @ValidateNested()
  @Type(() => BatchReservationOptionDTO)
  batchReservationOption: BatchReservationOptions<T>;
}
