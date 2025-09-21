import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { reservationType } from '@prisma/client';
import { RESERVATION_TYPES } from 'src/features/reservation/reservation.types';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ description: '예약 날짜 (YYYY-MM-DD)', example: '2026-05-09' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: '시작 시간 (HH:mm)', example: '19:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: '종료 시간 (HH:mm)', example: '21:00' })
  @IsString()
  endTime: string;

  @ApiProperty({ description: '예약 제목', example: '정기 연습' })
  @IsString()
  title: string;

  @ApiProperty({
    description: '예약 타입',
    enum: ['REGULAR', 'COMMON'],
    example: 'REGULAR',
  })
  @IsString()
  reservationType: Exclude<reservationType, 'EXTERNAL'>;

  @ApiProperty({ description: '참여 가능 여부', example: true })
  @IsBoolean()
  participationAvailable: boolean;

  @ApiProperty({
    description: '참가자 ID 목록',
    example: [1, 2],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  participatorIds: number[];

  @ApiProperty({
    description: '대여 악기 ID 목록',
    example: [10, 12],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  borrowInstrumentIds: number[];
}

export class CreateExternalReservationDto {
  @ApiProperty({ description: '예약 날짜 (YYYY-MM-DD)', example: '2026-05-09' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: '시작 시간 (HH:mm)', example: '19:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: '종료 시간 (HH:mm)', example: '21:00' })
  @IsString()
  endTime: string;

  @ApiProperty({ description: '예약 제목', example: '외부 예약' })
  @IsString()
  title: string;

  @ApiProperty({
    description: '예약 타입',
    enum: ['EXTERNAL'],
    example: 'EXTERNAL',
  })
  @IsString({})
  reservationType: 'EXTERNAL';

  @ApiProperty({ description: '참여 가능 여부', example: true })
  @IsBoolean()
  participationAvailable: boolean;

  @ApiProperty({ description: '외부 생성자 이름', example: '외부인' })
  @IsString()
  externalCreatorName: string;

  @ApiProperty({
    description: '참가자 ID 목록',
    example: [1, 2],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  participatorIds: number[];

  @ApiProperty({
    description: '대여 악기 ID 목록',
    example: [10, 12],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  borrowInstrumentIds: number[];
}

export class ForceCreateReservationDto {
  @ApiProperty({ description: '예약 날짜 (YYYY-MM-DD)', example: '2026-05-09' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: '시작 시간 (HH:mm)', example: '19:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: '종료 시간 (HH:mm)', example: '21:00' })
  @IsString()
  endTime: string;

  @ApiProperty({ description: '예약 제목', example: '임의 예약' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '외부 생성자 이름', example: '외부인' })
  @IsString()
  @IsOptional()
  externalCreatorName?: string;

  @ApiPropertyOptional({ description: '생성자 ID', example: 123 })
  @IsInt()
  @IsOptional()
  creatorId?: number;

  @ApiProperty({
    description: '예약 타입',
    enum: RESERVATION_TYPES,
    example: 'REGULAR',
  })
  @IsString()
  reservationType: reservationType;

  @ApiProperty({ description: '참여 가능 여부', example: true })
  @IsBoolean()
  participationAvailable: boolean;

  @ApiPropertyOptional({
    description: '참가자 ID 목록',
    example: [1, 2],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  participatorIds?: number[] = [];

  @ApiPropertyOptional({
    description: '대여 악기 ID 목록',
    example: [10, 12],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  borrowInstrumentIds?: number[] = [];
}
