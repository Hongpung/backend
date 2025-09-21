import { ApiProperty } from '@nestjs/swagger';

/** 사용자 예약 생성 직후 CQRS 핸들러가 반환하는 형태 */
export class ReservationCreatedResDto {
  @ApiProperty({ description: '생성된 예약 ID' })
  reservationId: number;
}

/** 수정·취소·삭제 등 단순 메시지 응답 */
export class ReservationCommandMessageResDto {
  @ApiProperty({ example: 'Success' })
  message: string;
}

export class AdminReservationCanceledConflictItemResDto {
  @ApiProperty()
  reservationId: number;

  @ApiProperty()
  title: string;
}

/** 관리자 예약 수정 시 충돌 취소 요약 포함 */
export class AdminModifyReservationResDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: [AdminReservationCanceledConflictItemResDto] })
  canceledConflictReservations: AdminReservationCanceledConflictItemResDto[];
}
