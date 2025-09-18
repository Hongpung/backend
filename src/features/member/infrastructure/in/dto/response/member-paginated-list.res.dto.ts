import { ApiProperty } from '@nestjs/swagger';
import { MemberListItemResDto } from './member-list-item.res.dto';

/** React Query pagination 호환 응답 */
export class MemberSearchPaginatedResDto {
  @ApiProperty({ description: '전체 항목 수', example: 150 })
  totalCount: number;

  @ApiProperty({ description: '전체 페이지 수', example: 8 })
  totalPages: number;

  @ApiProperty({ description: '현재 페이지 (0-based)', example: 0 })
  page: number;

  @ApiProperty({ description: '페이지당 항목 수 (20 | 40 | 80)', example: 20 })
  pageSize: number;

  @ApiProperty({ description: '회원 목록', type: [MemberListItemResDto] })
  members: MemberListItemResDto[];
}
