import type { SessionWirePayload } from '../../session-wire-payload.type';

export type SessionSnapshot = SessionWirePayload;
export type RealtimeSessionSnapshot = Extract<
  SessionSnapshot,
  { sessionType: 'REALTIME' }
>;
export type ReservationSessionSnapshot = Extract<
  SessionSnapshot,
  { sessionType: 'RESERVED' }
>;
