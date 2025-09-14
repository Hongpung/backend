import { ApiProperty } from '@nestjs/swagger';

export class NoticeResDto {
  @ApiProperty({ description: '공지사항 ID', example: 1 })
  noticeId: number;

  @ApiProperty({ description: '공지사항 제목', example: '새로운 공지사항' })
  title: string;

  @ApiProperty({
    description: '공지사항 내용',
    example: '공지사항 내용입니다.',
  })
  content: string;

  @ApiProperty({
    description: '생성 시간 (KST 벽시각)',
    example: '2026-05-09T09:00',
  })
  createdAt: string;

  @ApiProperty({
    description: '수정 시간 (KST 벽시각)',
    example: '2026-05-09T09:00',
  })
  updatedAt: string;
}
