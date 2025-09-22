import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { SessionOperationsReadVo } from './session-operations-read.vo';
import { ReservationSession } from '../entities/reservation-session.entity';
import { RealtimeSession } from '../entities/realtime-session.entity';
import { SessionDomainService } from '../runtime/session-domain.service';
import type {
  SessionEndBlockedReason,
  SessionExtendBlockedReason,
} from './session-operation-block-reason.vo';

type CurrentSessionReadable = RealtimeSession | ReservationSession;
type NextReservationReadable = ReservationSession;

export interface OnairSessionUseStateReadModel {
  currentSession: CurrentSessionReadable | null;
  serverTime: string;
  remainingMsUntilEnd: number | null;
  elapsedMsSinceStart: number | null;
  canEnd: boolean;
  endBlockedReason: SessionEndBlockedReason | null;
  canExtend: boolean;
  extendBlockedReason: SessionExtendBlockedReason | null;
  nextReservationSession: NextReservationReadable | null;
}

function hasActiveAttendance(session: CurrentSessionReadable): boolean {
  if (session instanceof RealtimeSession) {
    return session.attendanceList.some(({ status }) => status === '참가');
  }
  return session.attendanceList.some(
    ({ status }) => status === '출석' || status === '지각',
  );
}

export class OnairSessionUseStateReadModelFactory {
  static build(args: {
    now: Date;
    currentSession: CurrentSessionReadable | null;
    nextReservationSession: NextReservationReadable | null;
    followingBeforeReservation: ReservationSession | null;
    domainService: SessionDomainService;
  }): OnairSessionUseStateReadModel {
    const {
      now,
      currentSession,
      nextReservationSession,
      followingBeforeReservation,
      domainService,
    } = args;

    if (!currentSession) {
      return {
        currentSession: null,
        serverTime: now.toISOString(),
        remainingMsUntilEnd: null,
        elapsedMsSinceStart: null,
        canEnd: false,
        endBlockedReason: 'NO_CURRENT_SESSION',
        canExtend: false,
        extendBlockedReason: 'NO_CURRENT_SESSION',
        nextReservationSession,
      };
    }

    const endMs = AppKstDateTime.parseKstDateTime(
      currentSession.date,
      currentSession.endTime,
    ).getTime();
    const startMs = AppKstDateTime.parseKstDateTime(
      currentSession.date,
      currentSession.startTime,
    ).getTime();
    const remainingMsUntilEnd = Math.max(0, endMs - now.getTime());
    const elapsedMsSinceStart = Math.max(0, now.getTime() - startMs);

    const readVo = SessionOperationsReadVo.from(currentSession);
    const attended = hasActiveAttendance(currentSession);

    let endBlockedReason: SessionEndBlockedReason = 'NONE';
    if (!attended) {
      endBlockedReason = 'NOT_ATTENDED';
    } else if (!readVo.hasElapsedEnoughToEnd(now)) {
      endBlockedReason = 'MIN_ELAPSED_NOT_MET';
    }

    let extendBlockedReason: SessionExtendBlockedReason = 'NONE';
    if (!attended) {
      extendBlockedReason = 'NOT_ATTENDED';
    } else if (!readVo.canExtend(now)) {
      extendBlockedReason = 'MIN_REMAINING_NOT_MET';
    } else {
      const maxCapReason =
        currentSession instanceof RealtimeSession ||
        currentSession instanceof ReservationSession
          ? domainService.getExtendMaxCapBlockedReason({
              currentSession,
              followingReservation: followingBeforeReservation,
            })
          : null;
      if (maxCapReason != null) {
        extendBlockedReason = maxCapReason;
      }
    }

    const canEnd = endBlockedReason === 'NONE';
    const canExtend = extendBlockedReason === 'NONE';

    return {
      currentSession,
      serverTime: now.toISOString(),
      remainingMsUntilEnd,
      elapsedMsSinceStart,
      canEnd,
      endBlockedReason,
      canExtend,
      extendBlockedReason,
      nextReservationSession,
    };
  }
}
