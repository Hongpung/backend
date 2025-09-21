import { ReservationEntity } from '../../../domain/entities/reservation.entity';
import { OccupiedTimeReadModel } from '../out/reservation.repository.port';

export const ReservationUserQueryUseCasePort = Symbol(
  'ReservationUserQueryUseCasePort',
);

export interface ReservationUserQueryUseCasePort {
  getTodayReservations(params: {
    memberId: number;
  }): Promise<ReservationEntity[]>;
  getUserNextReservations(params: {
    memberId: number;
    skip: number;
  }): Promise<ReservationEntity[]>;
  getReservationsByTerm(params: {
    startDateString: string;
    endDateString: string;
  }): Promise<ReservationEntity[]>;
  getReservationsByMonth(params: {
    year: number;
    month: number;
  }): Promise<ReservationEntity[]>;
  getReservationsByDate(params: {
    dateString: string;
  }): Promise<ReservationEntity[]>;
  getOccupiedTimesOnDate(params: {
    dateString: string;
  }): Promise<OccupiedTimeReadModel[]>;
  getReservationDetail(params: {
    reservationId: number;
  }): Promise<ReservationEntity | null>;
}
