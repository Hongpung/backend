import type { ReservationSession } from '../../../domain/entities/reservation-session.entity';
import type { SessionExtendBlockedReason } from '../../../domain/value-objects/session-operation-block-reason.vo';
import type { RealtimeSessionProps } from '../../../domain/entities/realtime-session.entity';
import type { SessionUser } from '../../../domain/value-objects/session-user.vo';
import type { AttendToSessionRuntimeResultVo } from '../../../domain/value-objects/check-in-result.vo';
import type { SessionEntity } from './session-snapshot-store.port';

export const SessionRuntimePort = Symbol('SessionRuntimePort');

/**
 * Application Service가 런타임 세션 상태를 조회·변경할 때 사용하는 Port.
 *
 * 구체 구현(SessionRuntimeManager)은 이 인터페이스를 구현하며,
 * Application Service는 이 추상화에만 의존합니다.
 */
export interface SessionRuntimePort {
  // ─── 조회 ───
  getCurrentSessionStatus(): SessionEntity | null;
  getNextReservationSession(): ReservationSession | null;
  isAlreadyAttendUser(userId: number): boolean;
  isExtendAtMaxCap(): boolean;
  getExtendMaxCapBlockedReason(): SessionExtendBlockedReason | null;

  // ─── 세션 시작 ───
  startRealTimeSession(props: RealtimeSessionProps): Promise<void>;
  startReservationSession(starter: SessionUser): Promise<void>;

  // ─── 세션 운영 ───
  attendToSession(
    user: SessionUser,
  ): Promise<AttendToSessionRuntimeResultVo | null>;
  extendSession(): Promise<void>;
  clearSessionEndTimedJobs(sessionId: string | number): Promise<void>;
  endSessionById(sessionId: string): Promise<SessionEntity | void>;
  forceEndSessionIfMatching(
    expectedSessionId: string | number,
  ): Promise<boolean>;

  getSessionById(sessionId: string | number): SessionEntity | null;

  /**
   * 종료 임박·강제 종료 푸시 수신자 — job 등록 시점 스냅샷이 아닌 현재 ONAIR 출석 기준.
   * 세션이 없거나 종료됐으면 빈 배열(호출부에서 job payload로 fallback).
   */
  getOnairAttendanceMemberIds(sessionId: string | number): number[];
}
