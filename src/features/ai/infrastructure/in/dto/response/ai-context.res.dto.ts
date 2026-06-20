import { ApiProperty } from '@nestjs/swagger';

export class AiContentBlockResDto {
  @ApiProperty({ example: 'text' })
  type: string;

  [key: string]: unknown;
}

export class AiContextMessageResDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  role: 'user' | 'assistant';

  @ApiProperty({ type: [AiContentBlockResDto] })
  content: AiContentBlockResDto[];
}

export class AiContextReservationResDto {
  @ApiProperty({ example: '123' })
  id: string;

  @ApiProperty({ example: 'REGULAR' })
  status: string;

  @ApiProperty({ example: '2026-07-05' })
  date: string;

  @ApiProperty({ example: '정기 연습' })
  spaceName: string;
}

export class AiAvailableCommandResDto {
  @ApiProperty({ example: 'reservation_force_create' })
  name: string;

  @ApiProperty({ example: '관리자 권한으로 예약을 강제 생성합니다.' })
  description: string;
}

export class AiDomainSnapshotResDto {
  @ApiProperty({ type: [AiContextReservationResDto] })
  reservations: AiContextReservationResDto[];

  @ApiProperty({ type: [AiAvailableCommandResDto] })
  availableCommands: AiAvailableCommandResDto[];
}

export class AiContextResDto {
  @ApiProperty({ type: [AiContextMessageResDto] })
  messages: AiContextMessageResDto[];

  @ApiProperty({ type: AiDomainSnapshotResDto })
  domainSnapshot: AiDomainSnapshotResDto;
}
