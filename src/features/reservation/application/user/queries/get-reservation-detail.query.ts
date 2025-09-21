import { IQuery } from '@nestjs/cqrs';

/**
 * 예약 상세 조회 Query
 */
export class GetReservationDetailQuery implements IQuery {
  constructor(public readonly reservationId: number) {}
}
