import {
  DiscardedReservationListVO,
  DiscardReason,
} from 'src/features/discarded-reservation/domain/discarded-reservation.vo';

export const DiscardedReservationRepositoryPort = Symbol(
  'DiscardedReservationRepositoryPort',
);

export interface DiscardedReservationRepositoryPort {
  saveNoShowByReservationId(
    reservationId: number,
    reason?: DiscardReason,
  ): Promise<void>;
  findLatest(skip?: number, take?: number): Promise<DiscardedReservationListVO>;
}

export type IDiscardedReservationRepository =
  DiscardedReservationRepositoryPort;
