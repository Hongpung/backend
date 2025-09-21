import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetReservationsByTermQuery } from '../get-reservations-by-term.query';
import {
  ReservationRepositoryPort,
  IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

@QueryHandler(GetReservationsByTermQuery)
export class GetReservationsByTermHandler
  implements IQueryHandler<GetReservationsByTermQuery>
{
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly repository: IReservationRepository,
  ) {}

  async execute(
    query: GetReservationsByTermQuery,
  ): Promise<ReservationEntity[]> {
    const { startDateString, endDateString } = query;

    const startDate = AppKstDateTime.dateFormmatForDB(startDateString);
    const endDate = AppKstDateTime.dateFormmatForDB(endDateString);

    const reservations = await this.repository.findReservationsByTerm(
      startDate,
      endDate,
    );

    return reservations;
  }
}
