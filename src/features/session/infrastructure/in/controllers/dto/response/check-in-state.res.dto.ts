import type {
  ReservationSessionWirePayload,
  SessionWirePayload,
} from 'src/features/session/infrastructure/session-wire-payload.type';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject, IsString, ValidateIf } from 'class-validator';

export class CheckInSessionCreatableResDto {
  @ApiProperty({
    description: '체크인 상태',
    enum: ['CREATABLE'],
    example: 'CREATABLE',
  })
  @IsIn(['CREATABLE'])
  status: 'CREATABLE';

  @ApiProperty({
    description: '다음 예약 세션 정보',
    nullable: true,
    type: Object,
  })
  @ValidateIf((_, value) => value !== null)
  @IsObject()
  nextReservationSession: ReservationSessionWirePayload | null;
}

export class CheckInSessionStartableResDto {
  @ApiProperty({
    description: '체크인 상태',
    enum: ['STARTABLE'],
    example: 'STARTABLE',
  })
  @IsIn(['STARTABLE'])
  status: 'STARTABLE';

  @ApiProperty({ description: '다음 예약 세션 정보', type: Object })
  @IsObject()
  nextReservationSession: ReservationSessionWirePayload;
}

export class CheckInSessionJoinableResDto {
  @ApiProperty({
    description: '체크인 상태',
    enum: ['JOINABLE'],
    example: 'JOINABLE',
  })
  @IsIn(['JOINABLE'])
  status: 'JOINABLE';

  @ApiProperty({ description: '현재 세션 정보', type: Object })
  @IsObject()
  currentSession: SessionWirePayload;
}

export class CheckInSessionUnavailableResDto {
  @ApiProperty({
    description: '체크인 상태',
    enum: ['UNAVAILABLE'],
    example: 'UNAVAILABLE',
  })
  @IsIn(['UNAVAILABLE'])
  status: 'UNAVAILABLE';

  @ApiProperty({
    description: '불가 사유 메시지',
    example: '세션이 존재하지 않습니다.',
  })
  @IsString()
  errorMessage: string;
}

export type CheckInSessionStateResDto =
  | CheckInSessionCreatableResDto
  | CheckInSessionStartableResDto
  | CheckInSessionJoinableResDto
  | CheckInSessionUnavailableResDto;
