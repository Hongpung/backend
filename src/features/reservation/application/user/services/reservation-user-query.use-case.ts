import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetReservationDetailQuery } from '../queries/get-reservation-detail.query';
import { GetReservationsByDateQuery } from '../queries/get-reservations-by-date.query';
import { GetReservationsByMonthQuery } from '../queries/get-reservations-by-month.query';
import { GetReservationsByTermQuery } from '../queries/get-reservations-by-term.query';
import { GetTodayReservationsQuery } from '../queries/get-today-reservations.query';
import { GetUserNextReservationsQuery } from '../queries/get-user-next-reservations.query';
import { GetOccupiedTimesQuery } from '../queries/get-occupied-times.query';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { OccupiedTimeReadModel } from '../../ports/out/reservation.repository.port';
import { ReservationUserQueryUseCasePort } from '../../ports/in/reservation-user-query.use-case.port';

@Injectable()
export class ReservationUserQueryUseCase
  implements ReservationUserQueryUseCasePort
{
  constructor(private readonly queryBus: QueryBus) {}

  async getTodayReservations(params: {
    memberId: number;
  }): Promise<ReservationEntity[]> {
    return await this.queryBus.execute(
      new GetTodayReservationsQuery(params.memberId),
    );
  }

  async getUserNextReservations(params: {
    memberId: number;
    skip: number;
  }): Promise<ReservationEntity[]> {
    return await this.queryBus.execute(
      new GetUserNextReservationsQuery(params.memberId, params.skip),
    );
  }

  async getReservationsByTerm(params: {
    startDateString: string;
    endDateString: string;
  }): Promise<ReservationEntity[]> {
    return await this.queryBus.execute(
      new GetReservationsByTermQuery(
        params.startDateString,
        params.endDateString,
      ),
    );
  }

  async getReservationsByMonth(params: {
    year: number;
    month: number;
  }): Promise<ReservationEntity[]> {
    return await this.queryBus.execute(
      new GetReservationsByMonthQuery(params.year, params.month),
    );
  }

  async getReservationsByDate(params: {
    dateString: string;
  }): Promise<ReservationEntity[]> {
    return await this.queryBus.execute(
      new GetReservationsByDateQuery(params.dateString),
    );
  }

  async getOccupiedTimesOnDate(params: {
    dateString: string;
  }): Promise<OccupiedTimeReadModel[]> {
    return await this.queryBus.execute(
      new GetOccupiedTimesQuery(params.dateString),
    );
  }

  async getReservationDetail(params: {
    reservationId: number;
  }): Promise<ReservationEntity | null> {
    return await this.queryBus.execute(
      new GetReservationDetailQuery(params.reservationId),
    );
  }
}
