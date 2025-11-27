/** v1 live Socket.IO event names (`socket-live.json`) */
export const LEGACY_SESSION_LIST_WS_EVENT = {
  FETCH_RESERVATIONS: 'fetchReservations',
  RESERVATIONS: 'reservations',
  RESERVATIONS_FETCHED: 'reservationsFetched',
} as const;

export const SESSION_LIST_WS_EVENT = {
  FETCH_RESERVATIONS: 'fetch-session-list',
  RESERVATIONS: 'session-list',
  RESERVATIONS_FETCHED: 'session-list-fetched',
} as const;
