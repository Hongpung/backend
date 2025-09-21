import type {
  CreateReservationInput,
  UpdateReservationInput,
} from './reservation-user-command.types';

export const ReservationUserCommandUseCasePort = Symbol(
  'ReservationUserCommandUseCasePort',
);

export interface ReservationUserCommandUseCasePort {
  createReservation(params: {
    input: CreateReservationInput;
    memberId: number;
  }): Promise<void>;

  updateReservation(params: {
    reservationId: number;
    creatorId: number;
    input: UpdateReservationInput;
  }): Promise<void>;

  leaveReservation(params: {
    reservationId: number;
    memberId: number;
  }): Promise<void>;

  deleteReservation(params: {
    reservationId: number;
    creatorId: number;
  }): Promise<void>;
}
