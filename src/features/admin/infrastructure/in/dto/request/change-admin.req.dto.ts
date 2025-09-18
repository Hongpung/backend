import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AdminLevel } from '../../../../domain/admin.type';

/**
 * 관리자 권한 변경 Request DTO
 */
export class ChangeAdminReqDto {
  @ApiProperty({
    description: '관리자 권한 레벨',
    enum: ['SUPER', 'SUB'],
    example: 'SUB',
  })
  @IsString()
  @IsIn(['SUPER', 'SUB'])
  adminLevel: AdminLevel;
}
