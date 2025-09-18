import { ApiProperty } from '@nestjs/swagger';

/**
 * 관리자 간단 정보 Response DTO
 */
export class AdminSimpleResDto {
  @ApiProperty({ description: '회원 ID', example: 1 })
  memberId: number;

  @ApiProperty({ description: '이름', example: '홍길동' })
  name: string;

  @ApiProperty({ description: '닉네임', example: 'hong', nullable: true })
  nickname: string | null;

  @ApiProperty({ description: '동아리명', example: '홍풍', nullable: true })
  club: string | null;

  @ApiProperty({ description: '학번', example: '21' })
  enrollmentNumber: string;

  @ApiProperty({
    description: '관리자 권한 레벨',
    enum: ['SUPER', 'SUB'],
    example: 'SUB',
    nullable: true,
  })
  adminLevel: 'SUPER' | 'SUB' | null;
}
