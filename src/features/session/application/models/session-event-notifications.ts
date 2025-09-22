/** Session-owned discard notification (infra maps to wire events). */
export type SessionDiscardReservationNotification = {
  reservationId: number;
};

/** No-show discard job / runtime command payload. */
export type SessionNoShowDiscardNotification = {
  reservationId: number;
  sessionId?: string;
};

export type SessionExtendNotification = {
  sessionId: string;
  remainingMsUntilPreviousEnd: number;
  title: string;
  startTimeMs: number;
  endTimeMs: number;
};

export type SessionForceEndCommand = {
  sessionId: string | number;
};

export type SessionExternalReservationStartCommand = {
  sessionId: string;
  reservationId: number;
};
