import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordReqDto {
  @ApiProperty({
    description: '새 비밀번호',
    example: 'newPassword123',
    type: String,
  })
  @IsString({ message: '새 비밀번호는 문자열이어야 합니다.' })
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' })
  newPassword: string;
}
