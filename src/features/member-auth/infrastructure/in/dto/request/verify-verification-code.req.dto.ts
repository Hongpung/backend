import { IsEmail, IsNumberString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyVerificationCodeReqDto {
  @ApiProperty({
    description: '인증 코드를 받은 이메일 주소',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email: string;

  @ApiProperty({
    description: '인증 코드 (6자리)',
    example: '123456',
  })
  @IsNumberString()
  code: string;
}
