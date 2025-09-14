import { ApiProperty } from '@nestjs/swagger';

export class ClubMemberItemResDto {
  @ApiProperty()
  memberId: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  nickname: string | null;

  @ApiProperty()
  email: string;

  @ApiProperty()
  enrollmentNumber: string;

  @ApiProperty({ nullable: true })
  club: string | null;

  @ApiProperty({
    description: '역할 목록 (한글)',
    example: ['패짱'],
    type: [String],
  })
  role: string[];

  @ApiProperty({ nullable: true })
  profileImageUrl: string | null;

  @ApiProperty({ nullable: true })
  instagramUrl: string | null;

  @ApiProperty({ nullable: true })
  blogUrl: string | null;
}

export type ClubMembersResDto = ClubMemberItemResDto[];
