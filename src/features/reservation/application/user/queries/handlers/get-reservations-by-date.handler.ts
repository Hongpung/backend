import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetReservationsByDateQuery } from '../get-reservations-by-date.query';
import {
  ReservationRepositoryPort,
  IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';

@QueryHandler(GetReservationsByDateQuery)
export class GetReservationsByDateHandler
  implements IQueryHandler<GetReservationsByDateQuery>
{
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly repository: IReservationRepository,
  ) {}

  async execute(
    query: GetReservationsByDateQuery,
  ): Promise<ReservationEntity[]> {
    const { dateString } = query;

    const date = AppKstDateTime.dateFormmatForDB(dateString);

    const reservations = await this.repository.findReservationsByDate(date);

    return reservations;
  }
}
