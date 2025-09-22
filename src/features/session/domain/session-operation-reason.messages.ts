import {
  CLOSE_HOUR,
  END_SESSION_MIN_ELAPSED_MS,
  EXTEND_SESSION_MIN_REMAINING_MS,
} from './session.constant';

import type { SessionEndBlockedReason } from './value-objects/session-operation-block-reason.vo';
import type { SessionExtendBlockedReason } from './value-objects/session-operation-block-reason.vo';
import type { SessionOperationFailureReason } from './value-objects/session-operation-result.vo';

export type SessionOperationReasonCode =
  | SessionOperationFailureReason
  | SessionExtendBlockedReason
  | SessionEndBlockedReason;

/** REST·WebSocket 실패/차단 사유 — 해요체 사용자 문구 */
export const SESSION_OPERATION_REASON_MESSAGES_KO: Record<
  SessionOperationReasonCode,
  string
> = {
  UNAUTHORIZED: '참여할 수 없는 연습이에요.',
  NOT_FOUND: '진행 중인 연습을 찾을 수 없어요.',
  NOT_ALLOWED: '지금은 할 수 없어요.',
  NO_CURRENT_SESSION: '진행 중인 연습이 없어요.',
  NOT_ATTENDED: '참여중인 연습이 아니에요.',
  MIN_ELAPSED_NOT_MET: `연습 시작 후 ${Math.floor(END_SESSION_MIN_ELAPSED_MS / 60000)}분이 지나야 종료할 수 있어요.`,
  MIN_REMAINING_NOT_MET: `종료 ${Math.floor(EXTEND_SESSION_MIN_REMAINING_MS / 60000)}분 전에는 연장할 수 없어요.`,
  NEXT_RESERVATION_CONFLICT: '다음 예약 10분 전까지 연장했어요.',
  OPERATING_HOURS_EXCEEDED: `연습실 사용 종료 시각(${CLOSE_HOUR}:00)까지 연장했어요.`,
  SESSION_LOG_PERSIST_FAILED:
    '연습 기록 저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
  SESSION_LOG_RPC_TIMEOUT:
    '연습 기록 저장이 지연되어 취소했어요. 잠시 후 다시 종료해 주세요.',
  RUNTIME_END_FAILED:
    '연습 기록은 저장됐지만 연습 종료 처리에 실패했어요. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.',
  ALREADY_ENDED: '이미 종료된 연습이에요.',
  SESSION_ID_MISMATCH: '지금 진행 중인 연습과 일치하지 않아요.',
  NONE: '',
};

export function toSessionOperationReasonMessageKo(
  code: SessionOperationReasonCode,
): string {
  return SESSION_OPERATION_REASON_MESSAGES_KO[code];
}

export function toSessionBlockedReasonMessageKo(
  code: SessionExtendBlockedReason | SessionEndBlockedReason | null,
): string | null {
  if (code == null || code === 'NONE') {
    return null;
  }
  return SESSION_OPERATION_REASON_MESSAGES_KO[code];
}

/** 실패 응답용: 차단 사유가 있으면 우선, 없으면 실패 분류 사유 */
export function resolveSessionFailReasonMessageKo(args: {
  failureReason: SessionOperationFailureReason;
  blockedReason?: SessionExtendBlockedReason | SessionEndBlockedReason;
}): string {
  const blocked = args.blockedReason;
  if (blocked != null && blocked !== 'NONE') {
    return SESSION_OPERATION_REASON_MESSAGES_KO[blocked];
  }
  return SESSION_OPERATION_REASON_MESSAGES_KO[args.failureReason];
}
