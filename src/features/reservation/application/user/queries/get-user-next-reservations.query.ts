import { IQuery } from '@nestjs/cqrs';

/**
 * 사용자 다음 예약 목록 조회 Query
 */
export class GetUserNextReservationsQuery implements IQuery {
  constructor(
    public readonly memberId: number,
    public readonly skip: number,
  ) {}
}
