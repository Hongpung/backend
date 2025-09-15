import { ApiProperty } from '@nestjs/swagger';

export class DeleteBannerResDto {
  @ApiProperty({
    description: '삭제 성공 메시지',
    example: 'Banner deleted successfully',
  })
  message: string;
}
