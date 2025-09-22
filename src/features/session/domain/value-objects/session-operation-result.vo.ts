import type { SessionExtendBlockedReason } from './session-operation-block-reason.vo';

export interface IsCheckinResultVo {
  isCheckin: boolean;
}

export const SESSION_OPERATION_FAILURE_REASONS = [
  'NOT_FOUND',
  'UNAUTHORIZED',
  'NOT_ALLOWED',
] as const;
export type SessionOperationFailureReason =
  (typeof SESSION_OPERATION_FAILURE_REASONS)[number];

export interface SessionOperationSuccessResultVo {
  message: 'SUCCESS';
}

export interface SessionOperationFailResultVo {
  message: 'FAIL';
  reason: SessionOperationFailureReason;
  extendBlockedReason?: SessionExtendBlockedReason;
}

export type SessionOperationResultVo =
  | SessionOperationSuccessResultVo
  | SessionOperationFailResultVo;
