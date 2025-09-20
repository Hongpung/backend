import { ApiProperty } from '@nestjs/swagger';

export class VerifyPasswordVerificationResDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ description: '비밀번호 재설정 등 후속 단계용 검증 토큰' })
  token: string;
}
