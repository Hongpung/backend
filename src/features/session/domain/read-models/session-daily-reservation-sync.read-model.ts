import type { SessionBriefInstrument } from '../value-objects/session-brief-instrument.vo';
import type { SessionReservationType } from '../value-objects/session-reservation-type.vo';
import type { SessionUser } from '../value-objects/session-user.vo';

/** Session runtime daily sync input (mapped from reservation reads). */
export type SessionDailyReservationSyncItem = {
  reservationId: number;
  reservationType: SessionReservationType;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  participationAvailable: boolean;
  creatorName: string;
  creatorId?: number | null;
  creatorNickname?: string | null;
  participators?: SessionUser[];
  borrowInstruments?: SessionBriefInstrument[];
};

export type SessionDailyReservationSyncPayload = SessionDailyReservationSyncItem[];
