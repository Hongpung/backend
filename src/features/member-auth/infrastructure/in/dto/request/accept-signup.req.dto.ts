import { IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptSignupReqDto {
  @ApiProperty({
    description: '승인할 회원가입 ID 목록',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray({ message: 'ID 목록은 배열이어야 합니다.' })
  @ArrayMinSize(1, { message: '최소 1개 이상의 ID를 선택해야 합니다.' })
  @IsInt({ each: true, message: '모든 ID는 정수여야 합니다.' })
  acceptedSignUpIds: number[];
}
