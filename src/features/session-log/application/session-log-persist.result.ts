import type { SessionLogDetailReadModel } from '../domain/read-models/session-log.read-model';

export type SessionLogPersistResult =
  | { status: 'created'; sessionLog: SessionLogDetailReadModel }
  | { status: 'skipped'; skipReason: string }
  | { status: 'failed'; errorCode: string };
