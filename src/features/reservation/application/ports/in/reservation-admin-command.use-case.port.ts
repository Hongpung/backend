import type {
  BatchReservationInput,
  ForceCreateReservationInput,
  ForceUpdateReservationInput,
} from './reservation-user-command.types';
import type { ReservationType } from 'src/features/reservation/reservation.types';

export const ReservationAdminCommandUseCasePort = Symbol(
  'ReservationAdminCommandUseCasePort',
);

export interface ReservationAdminCommandUseCasePort {
  forceCreateReservation(
    input: ForceCreateReservationInput,
    adminId: number,
  ): Promise<unknown>;

  forceDeleteReservation(
    reservationId: number,
    adminId: number,
  ): Promise<unknown>;

  modifyReservation(
    reservationId: number,
    adminId: number,
    input: ForceUpdateReservationInput,
  ): Promise<unknown>;

  batchCreateReservations(
    adminId: number,
    batchInput: BatchReservationInput<ReservationType>,
  ): Promise<unknown>;
}
