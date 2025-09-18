import { ApiProperty } from '@nestjs/swagger';
import { AdminSimpleResDto } from './admin-simple.res.dto';

/**
 * 관리자 권한 삭제 Response DTO
 */
export class DeleteAdminResDto {
  @ApiProperty({
    description: '응답 메시지',
    example: '관리자 권한이 성공적으로 삭제되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: '권한이 삭제된 관리자 정보',
    type: AdminSimpleResDto,
  })
  admin: AdminSimpleResDto;
}
