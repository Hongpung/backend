import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional } from 'class-validator';
import {
  ATTEND_SESSION_SUCCESS_STATUSES,
  type AttendSessionFailStatus,
  type AttendSessionSuccessStatus,
} from 'src/features/session/domain/value-objects/check-in-result.vo';

export class AttendSessionSuccessResDto {
  @ApiPropertyOptional({ description: '응답 코드', example: 0 })
  @IsNumber()
  @IsOptional()
  code?: number;

  @ApiProperty({
    description: '출석 상태',
    enum: ATTEND_SESSION_SUCCESS_STATUSES,
    example: ATTEND_SESSION_SUCCESS_STATUSES[1],
  })
  @IsIn([...ATTEND_SESSION_SUCCESS_STATUSES])
  status: AttendSessionSuccessStatus;

  @ApiPropertyOptional({
    description: '지각 출석 시 예약 슬롯 시작 시각 대비 지각 분(올림)',
    example: 12,
  })
  @IsNumber()
  @IsOptional()
  lateMinutes?: number;
}

export class AttendSessionFailResDto {
  @ApiPropertyOptional({ description: '응답 코드', example: 400 })
  @IsNumber()
  @IsOptional()
  code?: number;

  @ApiProperty({
    description: '처리 상태',
    enum: ['실패'],
    example: '실패',
  })
  @IsIn(['실패'])
  status: AttendSessionFailStatus;
}

export type AttendSessionResDto =
  | AttendSessionSuccessResDto
  | AttendSessionFailResDto;
