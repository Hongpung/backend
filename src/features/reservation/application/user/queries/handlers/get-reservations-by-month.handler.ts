import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { GetReservationsByMonthQuery } from '../get-reservations-by-month.query';
import {
  ReservationRepositoryPort,
  IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';

@QueryHandler(GetReservationsByMonthQuery)
export class GetReservationsByMonthHandler
  implements IQueryHandler<GetReservationsByMonthQuery>
{
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly repository: IReservationRepository,
  ) {}

  async execute(
    query: GetReservationsByMonthQuery,
  ): Promise<ReservationEntity[]> {
    const { year, month } = query;

    const monthPadded = String(month).padStart(2, '0');
    const startYmd = `${year}-${monthPadded}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endYmd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
    const startDate = AppKstDateTime.dateFormmatForDB(startYmd);
    const endDate = AppKstDateTime.dateFormmatForDB(endYmd);

    const reservations = await this.repository.findReservationsByMonth(
      startDate,
      endDate,
    );

    return reservations;
  }
}
