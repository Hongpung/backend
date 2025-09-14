import { ApiProperty } from '@nestjs/swagger';

export class ClubInfoRoleItemResDto {
  @ApiProperty({ description: '역할 (한글)', example: '패짱' })
  role: string;

  @ApiProperty({ description: '멤버 정보' })
  member: {
    memberId: number;
    name: string;
    nickname: string | null;
    email: string;
    enrollmentNumber: string;
    club: string | null;
    role: string[];
    profileImageUrl: string | null;
    instagramUrl: string | null;
    blogUrl: string | null;
  };
}

export class ClubInfoResDto {
  @ApiProperty({
    description: '동아리 이름',
  })
  clubName: string;

  @ApiProperty({
    type: [ClubInfoRoleItemResDto],
    description: '역할별 멤버 목록',
  })
  roleData: ClubInfoRoleItemResDto[];

  @ApiProperty({ description: '동아리 프로필 이미지 URL', nullable: true })
  profileImage: string | null;
}

export class ClubInfoListResDto extends ClubInfoResDto {
  @ApiProperty({ description: '동아리 ID' })
  clubId: number;
  @ApiProperty({ description: '동아리 이름' })
  clubName: string;
}
