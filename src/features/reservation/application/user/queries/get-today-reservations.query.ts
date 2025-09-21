import { IQuery } from '@nestjs/cqrs';

/**
 * 오늘 예약 목록 조회 Query
 */
export class GetTodayReservationsQuery implements IQuery {
  constructor(public readonly memberId: number) {}
}
