import { EVENT_TOKEN } from './event.constant';
import * as EventPayload from './event.payload';

export interface EventPayloadMap {
  // Notice Events
  [EVENT_TOKEN.NOTICE_CREATED]: EventPayload.NoticeCreatedEvent;

  // Reservation Events
  [EVENT_TOKEN.RESERVATIONS_UPDATED]: EventPayload.ReservationsUpdatedEvent;
  [EVENT_TOKEN.DAILY_RESERVATIONS_LOADED]: EventPayload.DailyReservationsLoadedEvent;
  [EVENT_TOKEN.RESERVATION_SCHEDULE_NOTIFICATION]: EventPayload.ReservationScheduleNotificationEvent;

  // Session Events
  [EVENT_TOKEN.SESSION_STARTING_SOON]: EventPayload.SessionStartingSoonEvent;
  [EVENT_TOKEN.START_RESERVATION_SESSION]: EventPayload.VoidEvent;
  [EVENT_TOKEN.SESSION_UPDATE]: EventPayload.VoidEvent;
  [EVENT_TOKEN.END_SESSION]: EventPayload.EndSessionEvent;
  [EVENT_TOKEN.FORCE_END_SESSION]: EventPayload.ForceEndSessionEvent;
  [EVENT_TOKEN.RESTORE_SESSION_LIST]: EventPayload.VoidEvent;
  [EVENT_TOKEN.SESSION_LIST_CHANGED]: EventPayload.VoidEvent;
  [EVENT_TOKEN.START_EXTERNAL_RESERVATION]: EventPayload.StartExternalReservationEvent;
  [EVENT_TOKEN.NO_SHOW_DISCARD_RESERVATION]: EventPayload.NoShowDiscardReservationEvent;
  [EVENT_TOKEN.SERVER_DOWN_DISCARD_RESERVATION]: EventPayload.ServerDownDiscardReservationEvent;
  [EVENT_TOKEN.START_REALTIME_SESSION]: EventPayload.VoidEvent;
  [EVENT_TOKEN.ATTEND_SESSION]: EventPayload.VoidEvent;
  [EVENT_TOKEN.EXTEND_SESSION]: EventPayload.SessionExtendEvent;
  [EVENT_TOKEN.CREATE_SESSION]: EventPayload.VoidEvent;
  [EVENT_TOKEN.START_SESSION]: EventPayload.VoidEvent;

  [EVENT_TOKEN.MEMBER_REFRESH_TOKEN_REUSED]: EventPayload.MemberRefreshTokenReusedEvent;
  [EVENT_TOKEN.EDIT_INSTRUMENT]: EventPayload.EditInstrumentEvent;
  
  [EVENT_TOKEN.SEND_NOTIFICATION]: EventPayload.SendNotificationEvent;
  [EVENT_TOKEN.SEND_ALL_NOTIFICATION]: EventPayload.SendAllNotificationEvent;
}
