import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginReqDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '비밀번호', example: 'password123' })
  @IsString()
  password: string;

  @ApiProperty({
    description:
      '앱에서 생성한 디바이스 UUID (v1 호환: 생략 시 액세스 토큰만 발급, 디바이스·리프레시·신규 기기 알림 없음)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiProperty({
    description: '표시용 기기 이름',
    example: 'iPhone',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiProperty({
    description: '자동 로그인',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiProperty({
    description: '레거시 필드 — rememberMe와 동일 의미',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  autoLogin?: boolean;
}
