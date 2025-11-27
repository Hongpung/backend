import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class EndSessionReqDto {
  @ApiPropertyOptional({
    description:
      '종료할 런타임 세션 ID (v1 호환: 생략 시 현재 ONAIR 세션)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  sessionId?: string;

  @ApiProperty({
    description: '반납 이미지 URL 목록',
    example: ['https://example.com/return-1.jpg'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  returnImageUrls: string[];
}
