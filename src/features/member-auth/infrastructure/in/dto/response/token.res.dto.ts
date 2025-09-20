import { ApiProperty } from '@nestjs/swagger';

export class TokenResDto {
  @ApiProperty({ description: '액세스 JWT (기존 호환 필드명 token)' })
  token: string;

  @ApiProperty({ description: '리프레시 토큰 원문' })
  refreshToken: string;
}
