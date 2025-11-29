import type { RealtimeSession } from '../../../domain/entities/realtime-session.entity';
import type { ReservationSession } from '../../../domain/entities/reservation-session.entity';

export const SESSION_JOB_PORT = 'SESSION_JOB_PORT';

export type ForceEndJobData = RealtimeSession | ReservationSession;
export type ReservationOnlyJobData = ReservationSession;

export interface SessionJobPort {
  addForceEndJob(
    sessionId: string,
    data: ForceEndJobData,
    delayMs: number,
  ): Promise<void>;
  addForceEndAlarmJob(
    sessionId: string,
    data: ForceEndJobData,
    delayMs: number,
  ): Promise<void>;
  removeForceEndJob(sessionId: string): Promise<void>;
  removeForceEndAlarmJob(sessionId: string): Promise<void>;
  /** force-end·alarm·usage-control 경계 job 일괄 제거 */
  removeAllSessionEndTimedJobs(sessionId: string | number): Promise<void>;
  rescheduleForceEndJob(
    sessionId: string,
    data: ForceEndJobData,
    delayMs: number,
  ): Promise<void>;
  addSessionEndAvailableJob(
    sessionId: string,
    data: ForceEndJobData,
    delayMs: number,
  ): Promise<void>;
  addSessionExtendUnavailableJob(
    sessionId: string,
    data: ForceEndJobData,
    delayMs: number,
  ): Promise<void>;
  removeSessionEndAvailableJob(sessionId: string): Promise<void>;
  removeSessionExtendUnavailableJob(sessionId: string): Promise<void>;
  rescheduleSessionExtendUnavailableJob(
    sessionId: string,
    data: ForceEndJobData,
    delayMs: number,
  ): Promise<void>;
  addNoShowDiscardJob(
    sessionId: string,
    data: ReservationOnlyJobData,
    delayMs: number,
  ): Promise<void>;
  removeNoShowDiscardJob(sessionId: string): Promise<void>;
  addStartExternalReservationJob(
    sessionId: string,
    data: ReservationOnlyJobData,
    delayMs: number,
  ): Promise<void>;
  removeStartExternalReservationJob(sessionId: string): Promise<void>;
}
