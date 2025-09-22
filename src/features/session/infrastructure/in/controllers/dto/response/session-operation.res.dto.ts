import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
export class IsCheckinResDto {
  @ApiPropertyOptional({ description: '응답 코드', example: 0 })
  @IsNumber()
  @IsOptional()
  code?: number;

  @ApiProperty({ description: '체크인 여부', example: true })
  @IsBoolean()
  isCheckin: boolean;
}

export class SessionOperationSuccessResDto {
  @ApiPropertyOptional({ description: '응답 코드', example: 0 })
  @IsNumber()
  @IsOptional()
  code?: number;

  @ApiProperty({
    description: '처리 메시지',
    enum: ['SUCCESS'],
    example: 'SUCCESS',
  })
  @IsIn(['SUCCESS'])
  message: 'SUCCESS';
}

export class SessionOperationFailResDto {
  @ApiPropertyOptional({ description: '응답 코드', example: 0 })
  @IsNumber()
  @IsOptional()
  code?: number;

  @ApiProperty({
    description: '처리 메시지',
    enum: ['FAIL'],
    example: 'FAIL',
  })
  @IsIn(['FAIL'])
  message: 'FAIL';

  @ApiProperty({
    description: '실패 사유 (해요체)',
    example: '종료 15분 전에는 연장할 수 없어요.',
  })
  @IsString()
  reason: string;
}

export type SessionOperationResultResDto =
  | SessionOperationSuccessResDto
  | SessionOperationFailResDto;
