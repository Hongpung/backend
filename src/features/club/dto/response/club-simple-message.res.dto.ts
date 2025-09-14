import { ApiProperty } from '@nestjs/swagger';

export class ClubSimpleMessageResDto {
  @ApiProperty({ example: '동아리 정보 업데이트 성공' })
  message: string;
}
