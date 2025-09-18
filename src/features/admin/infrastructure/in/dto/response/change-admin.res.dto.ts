import { ApiProperty } from '@nestjs/swagger';
import { AdminSimpleResDto } from './admin-simple.res.dto';

/**
 * 관리자 권한 변경 Response DTO
 */
export class ChangeAdminResDto {
  @ApiProperty({
    description: '응답 메시지',
    example: '관리자 권한이 성공적으로 변경되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: '변경된 관리자 정보',
    type: AdminSimpleResDto,
  })
  admin: AdminSimpleResDto;
}
