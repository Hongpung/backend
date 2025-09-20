import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountReqDto {
  @ApiProperty({
    description: '계정 비밀번호 (탈퇴 확인용)',
    example: 'password123',
    type: String,
  })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  password: string;
}
