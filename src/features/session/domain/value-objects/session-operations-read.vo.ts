import {
  END_SESSION_MIN_ELAPSED_MS,
  EXTEND_SESSION_MIN_REMAINING_MS,
} from '../session.constant';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import type { RealtimeSession } from '../entities/realtime-session.entity';
import type { ReservationSession } from '../entities/reservation-session.entity';

type SessionReadable = RealtimeSession | ReservationSession;

export class SessionOperationsReadVo {
  private constructor(private readonly session: SessionReadable) {}

  static from(session: SessionReadable) {
    return new SessionOperationsReadVo(session);
  }

  /**
   * @param now 실제 UTC 인스턴트(예: `new Date()`, `Date.now()` 기반)
   */
  canExtend(now: Date): boolean {
    const endMs = AppKstDateTime.parseKstDateTime(
      this.session.date,
      this.session.endTime,
    ).getTime();
    const nowMs = now.getTime();
    const remainingMs = endMs - nowMs;
    return remainingMs >= EXTEND_SESSION_MIN_REMAINING_MS;
  }

  hasElapsedEnoughToEnd(nowUtc: Date): boolean {
    const startMs = AppKstDateTime.parseKstDateTime(
      this.session.date,
      this.session.startTime,
    ).getTime();
    const elapsedMs = nowUtc.getTime() - startMs;
    return elapsedMs >= END_SESSION_MIN_ELAPSED_MS;
  }
}
