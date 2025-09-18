import { IsArray, IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RoleAssignmentReqDto {
  @ApiProperty({
    description: '역할 목록',
    example: ['패짱', '상쇠'],
    type: [String],
    enum: ['상쇠', '패짱', '상장구', '수북', '수법고'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(['상쇠', '패짱', '상장구', '수북', '수법고'], { each: true })
  role: string[];
}
