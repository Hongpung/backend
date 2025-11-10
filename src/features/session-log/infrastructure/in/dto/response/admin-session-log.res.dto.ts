import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminSessionLogMemberResDto {
  @ApiProperty()
  memberId: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  nickname: string | null;

  @ApiPropertyOptional({ nullable: true })
  blogUrl: string | null;

  @ApiProperty()
  enrollmentNumber: string;

  @ApiPropertyOptional({ nullable: true })
  profileImageUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  instagramUrl: string | null;

  @ApiPropertyOptional()
  club?: string;

  @ApiProperty({ type: [String] })
  role: string[];
}

export class AdminSessionLogAttendanceResDto {
  @ApiProperty({ type: AdminSessionLogMemberResDto })
  member: AdminSessionLogMemberResDto;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ nullable: true })
  timeStamp: string | null;
}

export class AdminSessionLogBorrowInstrumentResDto {
  @ApiPropertyOptional({ nullable: true })
  imageUrl: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty()
  instrumentType: string;

  @ApiPropertyOptional()
  club?: string;
}

export class AdminSessionLogDetailResDto {
  @ApiProperty()
  sessionId: number;

  @ApiPropertyOptional({ nullable: true })
  creatorId: number | null;

  @ApiProperty()
  creatorName: string;

  @ApiPropertyOptional({ nullable: true })
  creatorNickname: string | null;

  @ApiProperty()
  sessionType: string;

  @ApiPropertyOptional({ nullable: true })
  reservationType: string | null;

  @ApiProperty()
  title: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty()
  extendCount: number;

  @ApiProperty()
  participationAvailable: boolean;

  @ApiProperty()
  forceEnd: boolean;

  @ApiPropertyOptional({
    description: '반납 이미지 URL (형식 가변)',
    nullable: true,
  })
  returnImageUrl: unknown;

  @ApiProperty({ type: [AdminSessionLogAttendanceResDto] })
  attendanceList: AdminSessionLogAttendanceResDto[];

  @ApiProperty({ type: [AdminSessionLogBorrowInstrumentResDto] })
  borrowInstruments: AdminSessionLogBorrowInstrumentResDto[];
}

export class AdminSessionCalendarDayResDto {
  @ApiProperty({ description: '날짜 (YYYY-MM-DD)' })
  date: string;

  @ApiProperty()
  sessionCount: number;
}
