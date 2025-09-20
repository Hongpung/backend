import {
  IsEmail,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupReqDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '비밀번호', example: 'password123' })
  @IsString()
  password: string;

  @ApiProperty({ description: '이름', example: '홍길동' })
  @IsString()
  name: string;

  @ApiProperty({ description: '학번', example: '24' })
  @IsNumberString()
  @Length(2)
  enrollmentNumber: string;

  @ApiProperty({ description: '동아리 ID (선택)', example: 1, required: false })
  @IsInt()
  @Max(3)
  @IsOptional()
  clubId?: number;

  @ApiProperty({
    description: '닉네임 (선택)',
    example: '닉네임',
    required: false,
  })
  @IsString()
  @IsOptional()
  nickname?: string;
}
