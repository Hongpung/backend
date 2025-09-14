import { ApiProperty } from '@nestjs/swagger';

export class CreateNoticeResDto {
  @ApiProperty({
    description: '응답 메시지',
    example: 'success to create notice',
  })
  message: string;
}
