export const FORCE_END_SESSION_SKIP_REASONS = [
  'NO_ON_AIR_SESSION',
  'SESSION_ID_MISMATCH',
  'ALREADY_ENDED',
] as const;

export type ForceEndSessionSkipReason =
  (typeof FORCE_END_SESSION_SKIP_REASONS)[number];

export type ForceEndSessionResultVo =
  | { status: 'success'; sessionLogId?: number }
  | { status: 'skipped'; skipReason: ForceEndSessionSkipReason }
  | { status: 'failed'; errorCode: string };
