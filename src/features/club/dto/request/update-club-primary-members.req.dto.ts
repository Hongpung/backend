import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateClubPrimaryMembersReqDto {
  @ApiProperty({
    description: '동아리 주요 활동 멤버 ID 목록',
    type: [Number],
    minItems: 1,
    example: [101, 205],
  })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  memberIds!: number[];
}
