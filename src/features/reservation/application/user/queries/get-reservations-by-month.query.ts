import { IQuery } from '@nestjs/cqrs';

/**
 * 월별 예약 목록 조회 Query
 */
export class GetReservationsByMonthQuery implements IQuery {
  constructor(
    public readonly year: number,
    public readonly month: number,
  ) {}
}
