export const SessionReservationStartRemindQueuePort = Symbol(
  'SessionReservationStartRemindQueuePort',
);

export interface SessionReservationStartRemindQueuePort {
  enqueue(reservationId: number, delayMs: number): Promise<void>;
}
