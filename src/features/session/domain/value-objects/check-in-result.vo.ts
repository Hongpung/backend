import type { RealtimeSession } from '../entities/realtime-session.entity';
import type { ReservationSession } from '../entities/reservation-session.entity';

export type SessionStatePayload = RealtimeSession | ReservationSession;
export type ReservationSessionStatePayload = ReservationSession;

export const CHECK_IN_SESSION_STATE_STATUSES = [
  'CREATABLE',
  'STARTABLE',
  'JOINABLE',
  'UNAVAILABLE',
] as const;

export type CheckInSessionStateStatus =
  (typeof CHECK_IN_SESSION_STATE_STATUSES)[number];

export const START_SESSION_STATUSES = ['CREATED', 'STARTED', 'FAILED'] as const;
export type StartSessionStatus = (typeof START_SESSION_STATUSES)[number];

export const ATTEND_SESSION_SUCCESS_STATUSES = [
  '참가',
  '출석',
  '결석',
  '지각',
] as const;
export type AttendSessionSuccessStatus =
  (typeof ATTEND_SESSION_SUCCESS_STATUSES)[number];

export type AttendSessionFailStatus = '실패';

export type AttendSessionSuccessResultVo =
  | { status: '지각'; lateMinutes: number }
  | { status: Exclude<AttendSessionSuccessStatus, '지각'> };

export type AttendToSessionRuntimeResultVo = AttendSessionSuccessResultVo;

export type CheckInSessionStateResultVo =
  | {
      status: 'CREATABLE';
      nextReservationSession: ReservationSessionStatePayload | null;
    }
  | {
      status: 'STARTABLE';
      nextReservationSession: ReservationSessionStatePayload;
    }
  | {
      status: 'JOINABLE';
      currentSession: SessionStatePayload;
    }
  | {
      status: 'UNAVAILABLE';
      errorMessage: string;
    };

const START_SESSION_RESULT_MESSAGES = ['CREATED', 'STARTED', 'FAILED'] as const;
export type StartSessionResultMessage =
  (typeof START_SESSION_RESULT_MESSAGES)[number];

export type StartSessionResultVo = { status: StartSessionResultMessage };

export type AttendSessionResultVo =
  | AttendSessionSuccessResultVo
  | { status: AttendSessionFailStatus };
