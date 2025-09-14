import { ApiProperty } from '@nestjs/swagger';

export class UpdateNoticeResDto {
  @ApiProperty({
    description: '응답 메시지',
    example: 'success to update notice',
  })
  message: string;
}
