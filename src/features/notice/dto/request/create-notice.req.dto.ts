import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateNoticeReqDto {
  @ApiProperty({ description: '채널 ID', example: 1, required: false })
  @IsOptional()
  @IsInt()
  channel?: number;

  @ApiProperty({ description: '공지사항 제목', example: '새로운 공지사항' })
  @IsString()
  title: string;

  @ApiProperty({
    description: '공지사항 내용',
    example: '공지사항 내용입니다.',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: '전체 공지 발송 여부',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  noticeAll?: boolean;
}
