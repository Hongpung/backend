import { ApiProperty } from '@nestjs/swagger';

export class MemberListItemResDto {
  @ApiProperty({ description: '회원 ID', example: 1 })
  memberId: number;

  @ApiProperty({ description: '이름', example: '홍길동' })
  name: string;

  @ApiProperty({ description: '닉네임', example: 'hong', nullable: true })
  nickname: string | null;

  @ApiProperty({ description: '이메일', example: 'hong@example.com' })
  email: string;

  @ApiProperty({ description: '학번', example: '21' })
  enrollmentNumber: string;

  @ApiProperty({ description: '동아리명', example: '홍풍', nullable: true })
  club: string | null;

  @ApiProperty({
    description: '역할 목록',
    example: ['패짱', '상쇠'],
    type: [String],
  })
  role: string[];

  @ApiProperty({ description: '프로필 이미지 URL', nullable: true })
  profileImageUrl: string | null;

  @ApiProperty({ description: '인스타그램 URL', nullable: true })
  instagramUrl: string | null;

  @ApiProperty({ description: '블로그 URL', nullable: true })
  blogUrl: string | null;
}
