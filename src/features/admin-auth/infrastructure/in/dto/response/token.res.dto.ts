import { ApiProperty } from '@nestjs/swagger';

export class TokenResDto {
  @ApiProperty({ description: 'JWT 토큰' })
  token: string;
}
