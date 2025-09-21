import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetUserNextReservationsQuery } from '../get-user-next-reservations.query';
import {
  ReservationRepositoryPort,
  IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';

@QueryHandler(GetUserNextReservationsQuery)
export class GetUserNextReservationsHandler
  implements IQueryHandler<GetUserNextReservationsQuery>
{
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly repository: IReservationRepository,
  ) {}

  async execute(
    query: GetUserNextReservationsQuery,
  ): Promise<ReservationEntity[]> {
    const { memberId, skip } = query;

    const today = new Date();
    const todayFormatted = AppKstDateTime.dateFormmatForDB(today);
    const take = 10; // 페이지당 10개

    const reservations = await this.repository.findNextReservationsByMemberId(
      memberId,
      todayFormatted,
      skip,
      take,
    );

    return reservations;
  }
}
