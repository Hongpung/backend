// Event tokens shared across features and infrastructure.
export const EVENT_TOKEN = {
  // Notification Events
  SEND_NOTIFICATION: 'notification.send',
  SEND_ALL_NOTIFICATION: 'notification.send-all',

  // Member auth events
  MEMBER_NEW_DEVICE_LOGIN: 'member-auth.new-device-login',
  MEMBER_REFRESH_TOKEN_REUSED: 'member-auth.refresh-token-reused',

  // Notice Events
  NOTICE_CREATED: 'notice.created',

  // Reservation Events
  RESERVATION_CREATED: 'reservation.created',
  RESERVATION_CANCELED: 'reservation.canceled',
  RESERVATION_UPDATED: 'reservation.updated',
  RESERVATIONS_UPDATED: 'reservations.updated',
  DAILY_RESERVATIONS_LOADED: 'reservation.daily-loaded',
  RESERVATION_PARTICIPATOR_LEFT: 'reservation.participator.left',
  RESERVATION_SCHEDULE_NOTIFICATION: 'reservation.schedule.notification',

  // Instrument Events
  EDIT_INSTRUMENT: 'instrument.edit',

  // Session Events
  SESSION_STARTING_SOON: 'session.startingSoon',
  START_RESERVATION_SESSION: 'start-reservation-session',
  SESSION_UPDATE: 'session-update',
  END_SESSION: 'end-session',
  FORCE_END_SESSION: 'force-end-session',
  RESTORE_SESSION_LIST: 'restore-session-list',
  SESSION_LIST_CHANGED: 'session-list-changed',
  START_EXTERNAL_RESERVATION: 'start-external-reservation',
  NO_SHOW_DISCARD_RESERVATION: 'no-show-discard-reservation',
  SERVER_DOWN_DISCARD_RESERVATION: 'server-down-discard-reservation',
  START_REALTIME_SESSION: 'start-realtime-session',
  ATTEND_SESSION: 'attend-session',
  EXTEND_SESSION: 'extend-session',
  CREATE_SESSION: 'create-session',
  START_SESSION: 'startSession',
} as const;

export type EventName = (typeof EVENT_TOKEN)[keyof typeof EVENT_TOKEN];
