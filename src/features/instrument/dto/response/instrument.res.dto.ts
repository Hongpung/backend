import { ApiProperty } from '@nestjs/swagger';

export class InstrumentResDto {
  @ApiProperty({ description: '악기 ID', example: 1 })
  instrumentId: number;

  @ApiProperty({ description: '악기 이름', example: '꽹과리 1번' })
  name: string;

  @ApiProperty({ description: '악기 타입 (한국어)', example: '꽹과리' })
  instrumentType: string;

  @ApiProperty({
    description: '악기 이미지 URL',
    example: 'https://example.com/instrument.jpg',
    required: false,
  })
  imageUrl?: string | null;

  @ApiProperty({ description: '대여 가능 여부', example: true })
  borrowAvailable: boolean;

  @ApiProperty({ description: '소속 동아리 정보' })
  club: string
}
