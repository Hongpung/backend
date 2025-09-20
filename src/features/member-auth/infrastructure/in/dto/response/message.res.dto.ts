import { ApiProperty } from '@nestjs/swagger';

export class MessageResDto {
  @ApiProperty({ description: '메시지' })
  message: string;
}
