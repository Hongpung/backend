import { IQuery } from '@nestjs/cqrs';

/**
 * 특정 날짜 예약 목록 조회 Query
 */
export class GetReservationsByDateQuery implements IQuery {
  constructor(public readonly dateString: string) {}
}
