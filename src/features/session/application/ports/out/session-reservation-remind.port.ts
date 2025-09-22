export const SessionReservationRemindPort = Symbol('SessionReservationRemindPort');

export interface SessionReservationRemindPort {
  sendUpcomingScheduleNotification(reservationId: number): Promise<void>;
}
