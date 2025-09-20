import { ApiProperty } from '@nestjs/swagger';

export class CheckEmailResDto {
  @ApiProperty({ description: '이메일 등록 여부' })
  isRegistered: boolean;
}
