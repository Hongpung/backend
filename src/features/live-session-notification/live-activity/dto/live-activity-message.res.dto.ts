import { ApiProperty } from '@nestjs/swagger';

export class LiveActivityMessageResDto {
  @ApiProperty()
  message: string;
}
