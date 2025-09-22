import {
  ATTENDANCE_ON_TIME_AFTER_START_COMPENSATED_MS,
  ATTENDANCE_ON_TIME_AFTER_START_MS,
  BASIC_TIME_INTERVAL,
  CLOSE_HOUR,
  RESERVATION_EARLY_START_MS,
} from '../session.constant';
import { ReservationSession } from '../entities/reservation-session.entity';
import { RealtimeSession } from '../entities/realtime-session.entity';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationStartWindowPolicy } from './reservation-start-window.policy';
import type { SessionExtendBlockedReason } from '../value-objects/session-operation-block-reason.vo';

export type SessionExtendContext = {
  currentSession: RealtimeSession | ReservationSession;
  followingReservation: ReservationSession | null;
};

export class SessionDomainService {
  /** 예약 슬롯(원 시작 시각) 기준 참가 지각 여부 — 보상 유예와 출석 허용 구간 일치 */
  isLateAttendance(
    session: ReservationSession,
    attendTime: Date,
    compensationApplies: boolean,
  ): boolean {
    const slotStart = AppKstDateTime.parseKstDateTime(
      session.date,
      session.plannedSlotStartHHmm,
    ).getTime();
    const threshold = compensationApplies
      ? ATTENDANCE_ON_TIME_AFTER_START_COMPENSATED_MS
      : ATTENDANCE_ON_TIME_AFTER_START_MS;
    return attendTime.getTime() - slotStart > threshold;
  }

  /** 예약 슬롯 시작 시각 대비 지각 분(올림). `isLateAttendance`가 true일 때만 의미 있다. */
  getLateAttendanceMinutes(
    session: ReservationSession,
    attendTime: Date,
  ): number {
    const slotStart = AppKstDateTime.parseKstDateTime(
      session.date,
      session.plannedSlotStartHHmm,
    ).getTime();
    const lateMs = Math.max(0, attendTime.getTime() - slotStart);
    return Math.ceil(lateMs / 60_000);
  }

  /** 체크인·discard에 쓰이는 다음 예약 BEFORE 세션(stale 및 보상 유예 반영) */
  findNextSchedulableReservation(
    sessions: (RealtimeSession | ReservationSession)[],
    currentOnAir: RealtimeSession | ReservationSession | null,
    nowMs: number,
  ): ReservationSession | null {
    for (const session of sessions) {
      if (!(session instanceof ReservationSession)) continue;
      if (session.status !== 'BEFORE') continue;

      const compensation = ReservationStartWindowPolicy.compensationApplies({
        currentOnAir,
        nextReservation: session,
      });

      const plannedStartMs =
        ReservationStartWindowPolicy.plannedStartMs(session);
      const stale = ReservationStartWindowPolicy.isStale({
        plannedStartMs,
        nowMs,
        compensation,
      });
      if (!stale) {
        return session;
      }
    }
    return null;
  }

  calculateDiscardDelay(
    session: ReservationSession,
    compensation: boolean,
  ): number {
    const startMs = AppKstDateTime.parseKstDateTime(
      session.date,
      session.plannedSlotStartHHmm,
    ).getTime();
    const grace = ReservationStartWindowPolicy.graceAfterStartMs(compensation);
    return startMs - Date.now() + grace;
  }

  /** 연장 상한: CLOSE_HOUR, 다음 예약 start − 10분 중 더 이른 시각(ms) */
  getExtendEndCapMs(ctx: SessionExtendContext): number {
    const closeMs = AppKstDateTime.parseKstDateTime(
      ctx.currentSession.date,
      `${String(CLOSE_HOUR).padStart(2, '0')}:00`,
    ).getTime();

    if (!ctx.followingReservation) {
      return closeMs;
    }

    const nextStartMs = AppKstDateTime.parseKstDateTime(
      ctx.followingReservation.date,
      ctx.followingReservation.plannedSlotStartHHmm,
    ).getTime();

    return Math.min(closeMs, nextStartMs - RESERVATION_EARLY_START_MS);
  }

  /** 현재 endTime이 연장 상한에 도달해 더 연장 불가 */
  isExtendAtMaxCap(ctx: SessionExtendContext): boolean {
    const currentEndMs = AppKstDateTime.parseKstDateTime(
      ctx.currentSession.date,
      ctx.currentSession.endTime,
    ).getTime();
    return currentEndMs >= this.getExtendEndCapMs(ctx);
  }

  /** 연장 클릭 시 적용할 새 종료 시각(ms) — 30분 또는 상한 중 작은 값 */
  resolveExtendEndMs(ctx: SessionExtendContext): number {
    const currentEndMs = AppKstDateTime.parseKstDateTime(
      ctx.currentSession.date,
      ctx.currentSession.endTime,
    ).getTime();
    const requestedEndMs = currentEndMs + BASIC_TIME_INTERVAL;
    return Math.min(requestedEndMs, this.getExtendEndCapMs(ctx));
  }

  /** 상한 도달 시 WS·API 차단 사유 */
  getExtendMaxCapBlockedReason(
    ctx: SessionExtendContext,
  ): SessionExtendBlockedReason | null {
    if (!this.isExtendAtMaxCap(ctx)) {
      return null;
    }

    const closeMs = AppKstDateTime.parseKstDateTime(
      ctx.currentSession.date,
      `${String(CLOSE_HOUR).padStart(2, '0')}:00`,
    ).getTime();

    if (this.getExtendEndCapMs(ctx) === closeMs) {
      return 'OPERATING_HOURS_EXCEEDED';
    }

    return 'NEXT_RESERVATION_CONFLICT';
  }

  findFollowingBeforeReservation(
    sessions: (RealtimeSession | ReservationSession)[],
    currentSessionId: string,
  ): ReservationSession | null {
    const idx = sessions.findIndex(
      (s) => String(s.sessionId) === currentSessionId,
    );
    if (idx === -1) return null;

    for (let i = idx + 1; i < sessions.length; i++) {
      const s = sessions[i];
      if (s instanceof ReservationSession && s.status === 'BEFORE') {
        return s;
      }
    }
    return null;
  }
}
