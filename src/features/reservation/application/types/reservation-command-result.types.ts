export type ReservationCreatedCommandResult = {
  reservationId: number;
};

export type ReservationCommandMessageResult = {
  message: string;
};

export type AdminModifyReservationCommandResult = {
  message: string;
  canceledConflictReservations: Array<{
    reservationId: number;
    title: string;
  }>;
};
