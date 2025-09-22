import { ALARM_BEFORE_END_MS } from '../../domain/session.constant';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationStartWindowPolicy } from '../../domain/runtime/reservation-start-window.policy';
import type { SessionEntity } from '../ports/out/session-snapshot-store.port';
import { ReservationSession } from '../../domain/entities/reservation-session.entity';

export type SessionRestoreAction =
  | { type: 'END_EXPIRED_ONAIR'; session: SessionEntity }
  | {
      type: 'SCHEDULE_FORCE_END';
      session: SessionEntity;
      delayMs: number;
      alarmDelayMs: number | null;
    }
  | {
      type: 'SCHEDULE_EXTERNAL_START';
      session: ReservationSession;
      delayMs: number;
    }
  | {
      type: 'SCHEDULE_NO_SHOW_DISCARD';
      session: ReservationSession;
      delayMs: number;
    }
  | { type: 'SERVER_DOWN_DISCARD'; session: ReservationSession }
  | { type: 'IGNORE'; session: SessionEntity };

export class SessionRestorePolicy {
  static filterSessionsForKstDay(
    sessions: SessionEntity[],
    todayKst: string,
  ): SessionEntity[] {
    return sessions.filter((session) => session.date === todayKst);
  }

  static isCacheDateValid(cachedDate: string, todayKst: string): boolean {
    if (cachedDate === todayKst) {
      return true;
    }

    const legacySnapshotTime = Date.parse(cachedDate);
    if (Number.isNaN(legacySnapshotTime)) {
      return false;
    }

    return (
      AppKstDateTime.kstCalendarYmdFromInstant(
        new Date(legacySnapshotTime),
      ) === todayKst
    );
  }

  static actionsForBootstrap(
    sessions: SessionEntity[],
    nowUtc: Date = new Date(),
  ): SessionRestoreAction[] {
    const currentOnAir =
      sessions.find((session) => session.status === 'ONAIR') ?? null;

    return sessions.map((session) =>
      this.actionForSession(session, currentOnAir, nowUtc),
    );
  }

  private static actionForSession(
    session: SessionEntity,
    currentOnAir: SessionEntity | null,
    nowUtc: Date,
  ): SessionRestoreAction {
    if (session.status === 'ONAIR') {
      const delayMs = AppKstDateTime.msUntilKstWallInstant(
        session.date,
        session.endTime,
        nowUtc.getTime(),
      );

      if (delayMs <= 0) {
        return { type: 'END_EXPIRED_ONAIR', session };
      }

      return {
        type: 'SCHEDULE_FORCE_END',
        session,
        delayMs,
        alarmDelayMs:
          delayMs > ALARM_BEFORE_END_MS ? delayMs - ALARM_BEFORE_END_MS : null,
      };
    }

    if (
      !(session instanceof ReservationSession) ||
      session.status !== 'BEFORE'
    ) {
      return { type: 'IGNORE', session };
    }

    if (session.reservationType === 'EXTERNAL') {
      const delayMs = AppKstDateTime.msUntilKstWallInstant(
        session.date,
        session.startTime,
        nowUtc.getTime(),
      );

      if (delayMs <= 0) {
        return { type: 'IGNORE', session };
      }

      return { type: 'SCHEDULE_EXTERNAL_START', session, delayMs };
    }

    const compensation = ReservationStartWindowPolicy.compensationApplies({
      currentOnAir,
      nextReservation: session,
    });
    const plannedStartMs = ReservationStartWindowPolicy.plannedStartMs(session);
    const stale = ReservationStartWindowPolicy.isStale({
      plannedStartMs,
      nowMs: nowUtc.getTime(),
      compensation,
    });

    if (stale) {
      return { type: 'SERVER_DOWN_DISCARD', session };
    }

    return {
      type: 'SCHEDULE_NO_SHOW_DISCARD',
      session,
      delayMs:
        plannedStartMs -
        nowUtc.getTime() +
        ReservationStartWindowPolicy.graceAfterStartMs(compensation),
    };
  }
}
