export const SessionDiscardedReservationWritePort = Symbol(
  'SessionDiscardedReservationWritePort',
);

export interface SessionDiscardedReservationWritePort {
  saveNoShowByReservationId(
    reservationId: number,
    reason?: 'NO_SHOW',
  ): Promise<void>;
}
