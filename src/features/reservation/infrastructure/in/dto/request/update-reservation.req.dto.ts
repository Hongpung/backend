import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  CreateReservationDto,
  ForceCreateReservationDto,
} from './create-reservation.req.dto';
import { IsArray, IsInt, IsOptional } from 'class-validator';

export class UpdateReservationDto extends PartialType(CreateReservationDto) {
  @ApiPropertyOptional({
    description: '추가 참가자 ID 목록',
    example: [1, 2],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  addedParticipatorIds?: number[];

  @ApiPropertyOptional({
    description: '삭제 참가자 ID 목록',
    example: [3, 4],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  removedParticipatorIds?: number[];

  @ApiPropertyOptional({
    description: '추가 대여 악기 ID 목록',
    example: [10, 12],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  addedBorrowInstrumentIds?: number[];

  @ApiPropertyOptional({
    description: '삭제 대여 악기 ID 목록',
    example: [13],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  removedBorrowInstrumentIds?: number[];
}

export class ForceUpdateReservationDto extends PartialType(
  ForceCreateReservationDto,
) {}
