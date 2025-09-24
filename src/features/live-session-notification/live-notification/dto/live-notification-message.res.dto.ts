import { ApiProperty } from '@nestjs/swagger';

export class LiveNotificationMessageResDto {
  @ApiProperty()
  message: string;
}
