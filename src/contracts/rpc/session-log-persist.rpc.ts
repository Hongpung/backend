import type { SessionSnapshotEventPayload } from '../events/event.payload';
import type { SessionLogDetailRpc } from './session-log-detail.rpc';

export type { SessionLogDetailRpc } from './session-log-detail.rpc';

export type SessionLogPersistRpcRequest = SessionSnapshotEventPayload & {
  runtimeSessionId: string;
};

export type SessionLogPersistRpcResponse =
  | { status: 'created'; sessionLog: SessionLogDetailRpc }
  | { status: 'skipped'; skipReason: string }
  | { status: 'failed'; errorCode: string };
