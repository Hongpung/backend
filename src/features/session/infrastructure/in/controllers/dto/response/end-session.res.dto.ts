import {
  IsNumber,
  IsString,
  IsOptional,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SessionLogDetailResDto } from './end-session-log-detail.res.dto';

export class EndSessionSuccessResDto {
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

  @ApiProperty({
    description: '종료된 연습 기록 (session-log 상세 API와 동일 필드)',
    type: SessionLogDetailResDto,
  })
  @ValidateNested()
  @Type(() => SessionLogDetailResDto)
  endSessionData: SessionLogDetailResDto;
}

export class EndSessionFailResDto {
  @ApiPropertyOptional({ description: '응답 코드', example: 400 })
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
    description: '종료 불가 사유 (해요체)',
    example: '연습 시작 후 15분이 지나야 종료할 수 있어요.',
  })
  @IsString()
  reason: string;
}

export type EndSessionResDto = EndSessionSuccessResDto | EndSessionFailResDto;
