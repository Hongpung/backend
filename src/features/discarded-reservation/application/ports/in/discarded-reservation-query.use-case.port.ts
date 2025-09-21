import { DiscardedReservationListVO } from '../../../domain/discarded-reservation.vo';

export const DiscardedReservationQueryUseCasePort = Symbol(
  'DiscardedReservationQueryUseCasePort',
);

export interface DiscardedReservationQueryUseCasePort {
  getDiscardedReservations(
    skip?: number,
    take?: number,
  ): Promise<DiscardedReservationListVO>;
}
