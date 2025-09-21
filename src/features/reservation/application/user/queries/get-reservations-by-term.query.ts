import { IQuery } from '@nestjs/cqrs';

/**
 * 기간별 예약 목록 조회 Query
 */
export class GetReservationsByTermQuery implements IQuery {
  constructor(
    public readonly startDateString: string,
    public readonly endDateString: string,
  ) {}
}
