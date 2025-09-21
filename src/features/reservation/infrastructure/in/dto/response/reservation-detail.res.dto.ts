import { ApiProperty } from '@nestjs/swagger';
import {
  RESERVATION_TYPES,
  ReservationType,
} from 'src/features/reservation/reservation.types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ValidateIf } from 'class-validator';

export class ReservationParticipatorResponseDto {
  @ApiProperty({ description: '멤버 ID' })
  @IsInt()
  memberId: number;

  @ApiProperty({ description: '프로필 이미지 URL', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  profileImageUrl: string | null;

  @ApiProperty({ description: '이름' })
  @IsString()
  name: string;

  @ApiProperty({ description: '닉네임', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  nickname: string | null;

  @ApiProperty({ description: '동아리 이름', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  club: string | null;

  @ApiProperty({ description: '블로그 URL', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  blogUrl: string | null;

  @ApiProperty({ description: '인스타그램 URL', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  instagramUrl: string | null;

  @ApiProperty({ description: '학번' })
  @IsString()
  enrollmentNumber: string;

  @ApiProperty({ description: '역할 목록', type: [String] })
  @IsArray()
  @IsString({ each: true })
  role: string[];
}

export class ReservationBorrowInstrumentResponseDto {
  @ApiProperty({ description: '악기 ID' })
  @IsInt()
  instrumentId: number;

  @ApiProperty({ description: '악기 이름' })
  @IsString()
  name: string;

  @ApiProperty({ description: '악기 타입 (한국어)' })
  @IsString()
  instrumentType: string;

  @ApiProperty({ description: '이미지 URL', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  imageUrl: string | null;

  @ApiProperty({ description: '동아리 이름' })
  @IsString()
  club: string;
}

export class ReservationDetailResponseDto {
  @ApiProperty({ description: '예약 ID' })
  @IsInt()
  reservationId: number;

  @ApiProperty({ description: '제목' })
  @IsString()
  title: string;

  @ApiProperty({
    description: '예약 유형',
    enum: RESERVATION_TYPES,
  })
  @IsIn(['REGULAR', 'COMMON', 'EXTERNAL'])
  reservationType: ReservationType;

  @ApiProperty({ description: '참여 가능 여부' })
  @IsBoolean()
  participationAvailable: boolean;

  @ApiProperty({ description: '생성자 ID', nullable: true })
  @IsOptional()
  @IsInt()
  creatorId?: number;

  @ApiProperty({ description: '생성자 이름', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  creatorName?: string | null;

  @ApiProperty({ description: '생성자 닉네임', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  creatorNickname?: string | null;

  @ApiProperty({ description: '날짜 (YYYY-MM-DD)' })
  @IsString()
  date: string;

  @ApiProperty({ description: '시작 시간 (HH:MM:SS)' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: '종료 시간 (HH:MM:SS)' })
  @IsString()
  endTime: string;

  @ApiProperty({
    description: '참가자 목록',
    type: [ReservationParticipatorResponseDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReservationParticipatorResponseDto)
  participators?: ReservationParticipatorResponseDto[];

  @ApiProperty({
    description: '대여 악기 목록',
    type: [ReservationBorrowInstrumentResponseDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReservationBorrowInstrumentResponseDto)
  borrowInstruments?: ReservationBorrowInstrumentResponseDto[];
}
