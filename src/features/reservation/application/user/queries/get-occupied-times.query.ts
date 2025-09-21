import { IQuery } from '@nestjs/cqrs';

/**
 * 점유 시간 조회 Query
 */
export class GetOccupiedTimesQuery implements IQuery {
  constructor(public readonly dateString: string) {}
}
