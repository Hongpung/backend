import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateInstrumentReqDto {
  @ApiProperty({
    description: '악기 타입 (한국어)',
    example: '꽹과리',
    enum: ['꽹과리', '징', '장구', '북', '소고', '기타'],
  })
  @IsString()
  @IsIn(['꽹과리', '징', '장구', '북', '소고', '기타'])
  instrumentType: string;

  @ApiProperty({ description: '악기 이름', example: '꽹과리 1번' })
  @IsString()
  name: string;

  @ApiProperty({
    description: '악기 이미지 URL',
    example: 'https://example.com/instrument.jpg',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;
}
