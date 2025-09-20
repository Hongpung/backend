import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForceDeleteReqDto {
  @ApiProperty({
    description: '관리자 비밀번호 (권한 확인용)',
    example: 'adminPassword123',
  })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  password: string;
}
