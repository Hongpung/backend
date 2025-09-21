import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetTodayReservationsQuery } from '../get-today-reservations.query';
import {
  ReservationRepositoryPort,
  IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';

@QueryHandler(GetTodayReservationsQuery)
export class GetTodayReservationsHandler
  implements IQueryHandler<GetTodayReservationsQuery>
{
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly repository: IReservationRepository,
  ) {}

  async execute(
    query: GetTodayReservationsQuery,
  ): Promise<ReservationEntity[]> {
    const { memberId } = query;

    const today = AppKstDateTime.todayDateAnchorForDb();

    const reservations = await this.repository.findTodayReservationsByMemberId(
      memberId,
      today,
    );

    return reservations;
  }
}
