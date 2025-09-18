import { ApiProperty } from '@nestjs/swagger';
import { AdminSimpleResDto } from './admin-simple.res.dto';

/**
 * 관리자 목록 Response DTO
 */
export class AdminListResDto {
  @ApiProperty({
    description: '관리자 목록',
    type: [AdminSimpleResDto],
  })
  admins: AdminSimpleResDto[];
}
