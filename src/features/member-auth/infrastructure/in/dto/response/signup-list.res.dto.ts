import { ApiProperty } from '@nestjs/swagger';

export class SignupListResDto {
  @ApiProperty({ description: '회원가입 ID (memberId)', example: 1 })
  signupId: number;

  @ApiProperty({ description: '이름', example: '홍길동' })
  name: string;

  @ApiProperty({ description: '닉네임', example: 'hong', nullable: true })
  nickname: string | null;

  @ApiProperty({ description: '동아리명', example: '홍풍', nullable: true })
  club: string | null;

  @ApiProperty({ description: '학번', example: '21' })
  enrollmentNumber: string;

  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  email: string;
}
