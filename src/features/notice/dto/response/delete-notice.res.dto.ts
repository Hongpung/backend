import { ApiProperty } from '@nestjs/swagger';

export class DeleteNoticeResDto {
  @ApiProperty({
    description: '응답 메시지',
    example: 'success to delete notice',
  })
  message: string;
}
