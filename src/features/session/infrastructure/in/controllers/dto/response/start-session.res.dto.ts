import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional } from 'class-validator';
import { START_SESSION_STATUSES } from 'src/features/session/domain/value-objects/check-in-result.vo';

const [START_SESSION_CREATED, START_SESSION_STARTED, START_SESSION_FAILED] =
  START_SESSION_STATUSES;

export class StartSessionCreatedResDto {
  @ApiPropertyOptional({ description: '응답 코드', example: 0 })
  @IsNumber()
  @IsOptional()
  code?: number;

  @ApiProperty({
    description: '처리 상태',
    enum: [START_SESSION_CREATED],
    example: START_SESSION_CREATED,
  })
  @IsIn([START_SESSION_CREATED])
  status: typeof START_SESSION_CREATED;
}

export class StartSessionStartedResDto {
  @ApiPropertyOptional({ description: '응답 코드', example: 0 })
  @IsNumber()
  @IsOptional()
  code?: number;

  @ApiProperty({
    description: '처리 상태',
    enum: [START_SESSION_STARTED],
    example: START_SESSION_STARTED,
  })
  @IsIn([START_SESSION_STARTED])
  status: typeof START_SESSION_STARTED;
}

export class StartSessionFailResDto {
  @ApiPropertyOptional({ description: '응답 코드', example: 400 })
  @IsNumber()
  @IsOptional()
  code?: number;

  @ApiProperty({
    description: '처리 상태',
    enum: [START_SESSION_FAILED],
    example: START_SESSION_FAILED,
  })
  @IsIn([START_SESSION_FAILED])
  status: typeof START_SESSION_FAILED;
}

export type StartSessionResDto =
  | StartSessionCreatedResDto
  | StartSessionStartedResDto
  | StartSessionFailResDto;
