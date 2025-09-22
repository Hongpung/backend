import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionLogResDto {
  @ApiProperty({ description: '세션 ID', example: 1 })
  sessionId: number;

  @ApiPropertyOptional({
    description: '생성자 ID',
    example: 123,
    nullable: true,
  })
  creatorId: number | null;

  @ApiProperty({ description: '생성자 이름', example: '홍길동' })
  creatorName: string;

  @ApiPropertyOptional({
    description: '생성자 닉네임',
    example: 'hong',
    nullable: true,
  })
  creatorNickname: string | null;

  @ApiProperty({ description: '세션 제목', example: '정기 연습' })
  title: string;

  @ApiProperty({ description: '날짜 (YYYY-MM-DD)', example: '2026-05-09' })
  date: string;

  @ApiProperty({ description: '시작 시간 (HH:mm)', example: '19:00' })
  startTime: string;

  @ApiProperty({ description: '종료 시간 (HH:mm)', example: '21:00' })
  endTime: string;

  @ApiProperty({ description: '세션 타입', example: 'REGULAR' })
  sessionType: string;

  @ApiPropertyOptional({
    description: '예약 타입',
    example: 'REGULAR',
    nullable: true,
  })
  reservationType: string | null;

  @ApiProperty({ description: '참여 가능 여부', example: true })
  participationAvailable: boolean;

  @ApiProperty({ description: '강제 종료 여부', example: false })
  forceEnd: boolean;

  @ApiProperty({ description: '출석 인원 수', example: 8 })
  attendeeCount: number;
}
