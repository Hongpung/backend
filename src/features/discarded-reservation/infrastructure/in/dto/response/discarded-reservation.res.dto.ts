import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DiscardedReservationSnapshot } from 'src/features/discarded-reservation/domain/discarded-reservation.vo';
import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsObject,
  ValidateNested,
} from 'class-validator';

export class DiscardedReservationItemResponseDto {
  @ApiProperty({ description: 'discarded 예약 레코드 ID' })
  @IsInt()
  discardedReservationId: number;

  @ApiProperty({ description: '원본 예약 ID' })
  @IsInt()
  reservationId: number;

  @ApiProperty({ description: 'discard 처리 주체', enum: ['SYSTEM', 'ADMIN'] })
  @IsIn(['SYSTEM', 'ADMIN'])
  discardedByType: 'SYSTEM' | 'ADMIN';

  @ApiProperty({
    description: 'discard 사유',
    enum: ['NO_SHOW', 'ADMIN_FORCE_DISCARD', 'SYSTEM_RECOVERY'],
  })
  @IsIn(['NO_SHOW', 'ADMIN_FORCE_DISCARD', 'SYSTEM_RECOVERY'])
  discardReason: 'NO_SHOW' | 'ADMIN_FORCE_DISCARD' | 'SYSTEM_RECOVERY';

  @ApiProperty({
    description: 'discard 시점 reservation 값(JSON)',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  reservation: DiscardedReservationSnapshot;

  @ApiProperty({ description: '레코드 생성 시각' })
  @Type(() => Date)
  @IsDate()
  createdAt: Date;
}

export class DiscardedReservationListResponseDto {
  @ApiProperty({ type: [DiscardedReservationItemResponseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiscardedReservationItemResponseDto)
  items: DiscardedReservationItemResponseDto[];

  @ApiProperty({ description: '전체 개수' })
  @IsInt()
  total: number;
}
