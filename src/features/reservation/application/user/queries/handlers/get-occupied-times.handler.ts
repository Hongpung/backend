import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetOccupiedTimesQuery } from '../get-occupied-times.query';
import {
  OccupiedTimeReadModel,
  ReservationRepositoryPort,
  IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';

@QueryHandler(GetOccupiedTimesQuery)
export class GetOccupiedTimesHandler
  implements IQueryHandler<GetOccupiedTimesQuery>
{
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly repository: IReservationRepository,
  ) {}

  async execute(
    query: GetOccupiedTimesQuery,
  ): Promise<OccupiedTimeReadModel[]> {
    const { dateString } = query;

    const date = new Date(dateString);

    const occupiedTimes = await this.repository.findOccupiedTimesByDate(date);

    return occupiedTimes;
  }
}
