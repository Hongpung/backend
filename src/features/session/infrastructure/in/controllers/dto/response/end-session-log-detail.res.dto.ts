import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class SessionLogDetailMemberResDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  memberId: number;

  @ApiProperty({ example: '홍길동' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  nickname: string | null;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  blogUrl: string | null;

  @ApiProperty({ example: '2021001' })
  @IsString()
  enrollmentNumber: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  profileImageUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  instagramUrl: string | null;

  @ApiPropertyOptional({ example: '어흥' })
  @IsOptional()
  @IsString()
  club?: string;

  @ApiProperty({ type: [String], example: ['패자'] })
  @IsArray()
  @IsString({ each: true })
  role: string[];
}

export class SessionLogDetailAttendanceResDto {
  @ApiProperty({ type: SessionLogDetailMemberResDto })
  @ValidateNested()
  @Type(() => SessionLogDetailMemberResDto)
  member: SessionLogDetailMemberResDto;

  @ApiProperty({ example: '참가' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ example: '19:00', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  timeStamp: string | null;
}

export class SessionLogDetailBorrowInstrumentResDto {
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  imageUrl: string | null;

  @ApiProperty({ example: '장구' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'KWANGGWARI' })
  @IsString()
  instrumentType: string;

  @ApiPropertyOptional({ example: '어흥' })
  @IsOptional()
  @IsString()
  club?: string;
}

export class SessionLogDetailBaseResDto {
  @ApiProperty({
    description: '세션 로그 ID (DB Session.sessionId)',
    example: 1,
  })
  @IsInt()
  sessionId: number;

  @ApiPropertyOptional({ example: 123, nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  creatorId: number | null;

  @ApiProperty({ example: '홍길동' })
  @IsString()
  creatorName: string;

  @ApiPropertyOptional({ example: 'hong', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  creatorNickname: string | null;

  @ApiProperty({ example: '정기 연습' })
  @IsString()
  title: string;

  @ApiProperty({ example: '2026-05-09' })
  @IsString()
  date: string;

  @ApiProperty({ example: '19:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '21:00' })
  @IsString()
  endTime: string;

  @ApiProperty({ example: 'REALTIME', enum: ['REALTIME', 'RESERVED'] })
  @IsIn(['REALTIME', 'RESERVED'])
  sessionType: string;

  @ApiPropertyOptional({ example: 'REGULAR', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsIn(['REGULAR', 'COMMON', 'EXTERNAL'])
  reservationType: string | null;

  @ApiProperty({ example: true })
  @IsBoolean()
  participationAvailable: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  forceEnd: boolean;
}

export class SessionLogDetailResDto extends SessionLogDetailBaseResDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  extendCount: number;

  @ApiPropertyOptional({ nullable: true, type: Object })
  @IsOptional()
  returnImageUrl: unknown;

  @ApiPropertyOptional({ example: 10, nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  reservationId: number | null;

  @ApiProperty({ type: [SessionLogDetailAttendanceResDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionLogDetailAttendanceResDto)
  attendanceList: SessionLogDetailAttendanceResDto[];

  @ApiProperty({ type: [SessionLogDetailBorrowInstrumentResDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionLogDetailBorrowInstrumentResDto)
  borrowInstruments: SessionLogDetailBorrowInstrumentResDto[];
}
