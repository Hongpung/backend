import {
  END_SESSION_MIN_ELAPSED_MS,
  EXTEND_SESSION_MIN_REMAINING_MS,
} from '../../domain/session.constant';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

export type SessionUseStateBoundaryDelays = {
  /** 시작 후 15분 — 수동 종료 가능 시점 */
  endAvailableDelayMs: number | null;
  /** 종료 15분 전 — 연장 불가 시점 */
  extendUnavailableDelayMs: number | null;
};

export function computeSessionUseStateBoundaryDelays(
  session: { date: string; startTime: string; endTime: string },
  nowUtc: Date = new Date(),
): SessionUseStateBoundaryDelays {
  const nowMs = nowUtc.getTime();
  const startMs = AppKstDateTime.parseKstDateTime(session.date, session.startTime).getTime();
  const endMs = AppKstDateTime.parseKstDateTime(session.date, session.endTime).getTime();

  const endAvailableDelayMs = startMs + END_SESSION_MIN_ELAPSED_MS - nowMs;
  const extendUnavailableDelayMs =
    endMs - EXTEND_SESSION_MIN_REMAINING_MS - nowMs;

  return {
    endAvailableDelayMs:
      endAvailableDelayMs > 0 ? endAvailableDelayMs : null,
    extendUnavailableDelayMs:
      extendUnavailableDelayMs > 0 ? extendUnavailableDelayMs : null,
  };
}
