import type { SessionLogDetailReadModel } from '../read-models/session-log-detail.read-model';
import type { RealtimeSession } from '../entities/realtime-session.entity';
import type { ReservationSession } from '../entities/reservation-session.entity';
import type { SessionEndBlockedReason } from './session-operation-block-reason.vo';
import type { SessionOperationFailureReason } from './session-operation-result.vo';

export type EndedSessionPayload = RealtimeSession | ReservationSession;

export interface EndSessionSuccessResultVo {
  message: 'SUCCESS';
  endedSession: EndedSessionPayload;
  returnImageUrls: string[];
  forceEnd: boolean;
  /** persist created 시 RPC로 받은 session-log 상세 (DB read model과 동일) */
  sessionLogDetail?: SessionLogDetailReadModel;
}

export interface EndSessionFailResultVo {
  message: 'FAIL';
  reason: SessionOperationFailureReason;
  endBlockedReason?: SessionEndBlockedReason;
}

export type EndSessionResultVo =
  | EndSessionSuccessResultVo
  | EndSessionFailResultVo;
