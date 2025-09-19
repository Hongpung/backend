import { ApiProperty } from '@nestjs/swagger';

export class BorrowHistoryResDto {
  @ApiProperty({ description: '대여자 이름', example: '홍길동' })
  borrowerName: string;

  @ApiProperty({
    description: '대여자 닉네임',
    example: '길동',
    required: false,
  })
  borrowerNickname?: string;

  @ApiProperty({ description: '대여 일자', example: '2026-04-06' })
  borrowDate: string;
}

export class InstrumentDetailResDto {
  @ApiProperty({ description: '악기 ID', example: 1 })
  instrumentId: number;

  @ApiProperty({ description: '악기 이미지 URL', required: false })
  imageUrl?: string | null;

  @ApiProperty({ description: '악기 이름', example: '꽹과리 1번' })
  name: string;

  @ApiProperty({ description: '악기 타입(한국어)', example: '꽹과리' })
  instrumentType: string;

  @ApiProperty({ description: '소속 동아리명', example: '농악부' })
  club: string;

  @ApiProperty({ description: '대여 가능 여부', example: true })
  borrowAvailable: boolean;

  @ApiProperty({
    description: '대여 이력(최신순, 최대 10개)',
    type: [BorrowHistoryResDto],
  })
  borrowHistory: BorrowHistoryResDto[];
}
