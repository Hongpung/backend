import type { SessionUser } from '../domain/value-objects/session-user.vo';
import type { SessionBriefInstrument } from '../domain/value-objects/session-brief-instrument.vo';
import type { SessionReservationType } from '../domain/value-objects/session-reservation-type.vo';

type BaseSessionWirePayload = {
  sessionId: string ;
  date: string;
  sessionType: string;
  title: string;
  startTime: string;
  endTime: string;
  extendCount: number;
  creatorId?: number;
  creatorName: string;
  creatorNickname?: string;
  participationAvailable: boolean;
  status: 'BEFORE' | 'ONAIR' | 'AFTER' | 'DISCARDED';
  participators?: SessionUser[];
  participatorIds?: number[];
  borrowInstruments?: SessionBriefInstrument[];
  attendanceList: {
    user: SessionUser;
    status: '참가' | '출석' | '결석' | '지각';
    timeStamp?: string | Date;
  }[];
};

export type RealtimeSessionWirePayload = BaseSessionWirePayload & {
  sessionType: 'REALTIME';
  borrowInstruments?: null;
  status: 'ONAIR' | 'AFTER';
  attendanceList: {
    user: SessionUser;
    status: '참가';
    timeStamp?: string | Date;
  }[];
};

export type ReservationSessionWirePayload = BaseSessionWirePayload & {
  reservationId: number;
  sessionType: 'RESERVED';
  reservationType: SessionReservationType;
  plannedStartTime?: string;
  slotAttendanceCompensationApplied?: boolean;
  participationAvailable: boolean;
  participators?: SessionUser[];
  participatorIds?: number[];
  borrowInstruments?: SessionBriefInstrument[];
  status: 'BEFORE' | 'ONAIR' | 'AFTER' | 'DISCARDED';
  attendanceList: {
    user: SessionUser;
    status: '출석' | '결석' | '지각';
    timeStamp?: string | Date;
  }[];
};

export type SessionWirePayload =
  | RealtimeSessionWirePayload
  | ReservationSessionWirePayload;
