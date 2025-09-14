import { ApiProperty } from '@nestjs/swagger';

export class ClubInstrumentItemResDto {
  @ApiProperty()
  instrumentId: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: '악기 종류 (한글)', example: '꽹과리' })
  instrumentType: string;

  @ApiProperty()
  imageUrl: string;

  @ApiProperty()
  borrowAvailable: boolean;
}

export type ClubInstrumentsResDto = ClubInstrumentItemResDto[];
