import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetReservationDetailQuery } from '../get-reservation-detail.query';
import {
  ReservationRepositoryPort,
  IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';

@QueryHandler(GetReservationDetailQuery)
export class GetReservationDetailHandler
  implements IQueryHandler<GetReservationDetailQuery>
{
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly repository: IReservationRepository,
  ) {}

  async execute(
    query: GetReservationDetailQuery,
  ): Promise<ReservationEntity | null> {
    const { reservationId } = query;
    return this.repository.findReservationDetail(reservationId);
  }
}
