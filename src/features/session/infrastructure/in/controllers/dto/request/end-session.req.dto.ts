import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID } from 'class-validator';

export class EndSessionReqDto {
  @ApiProperty({
    description: '종료할 런타임 세션 ID (체크인·세션 목록과 동일한 UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsUUID('4')
  sessionId: string;

  @ApiProperty({
    description: '반납 이미지 URL 목록',
    example: ['https://example.com/return-1.jpg'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  returnImageUrls: string[];
}
