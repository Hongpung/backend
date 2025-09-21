import { ApiProperty } from '@nestjs/swagger';
import {
  RESERVATION_TYPES,
  ReservationType,
} from 'src/features/reservation/reservation.types';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { ValidateIf } from 'class-validator';

export class ReservationResponseDto {
  @ApiProperty({ description: '예약 ID' })
  @IsInt()
  reservationId: number;

  @ApiProperty({ description: '예약 날짜 (YYYY-MM-DD)' })
  @IsString()
  date: string;

  @ApiProperty({ description: '시작 시간 (HH:mm)' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: '종료 시간 (HH:mm)' })
  @IsString()
  endTime: string;

  @ApiProperty({ description: '예약 제목' })
  @IsString()
  title: string;

  @ApiProperty({ description: '생성자 ID', required: false, nullable: true })
  @IsOptional()
  @IsInt()
  creatorId?: number;

  @ApiProperty({ description: '생성자 이름' })
  @IsString()
  creatorName: string;

  @ApiProperty({
    description: '생성자 닉네임',
    required: false,
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  creatorNickname?: string;

  @ApiProperty({
    description: '예약 타입',
    enum: RESERVATION_TYPES,
  })
  @IsIn(['REGULAR', 'COMMON', 'EXTERNAL'])
  reservationType: ReservationType;

  @ApiProperty({ description: '참여 가능 여부' })
  @IsBoolean()
  participationAvailable: boolean;

  @ApiProperty({ description: '참가자 수' })
  @IsInt()
  amountOfParticipators: number;
}
