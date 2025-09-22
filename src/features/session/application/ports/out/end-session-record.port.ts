import type { SessionLogDetailReadModel } from '../../../domain/read-models/session-log-detail.read-model';
import type { SessionLogPersistRpcRequest } from 'src/contracts/rpc/session-log-persist.rpc';

export const EndSessionRecordPort = Symbol('EndSessionRecordPort');

export type EndSessionRecordResult =
  | { status: 'created'; sessionLog: SessionLogDetailReadModel }
  | { status: 'skipped'; skipReason: string }
  | { status: 'failed'; errorCode: string };

export interface EndSessionRecordPort {
  record(request: SessionLogPersistRpcRequest): Promise<EndSessionRecordResult>;

  /** persist 실패·타임아웃 시 runtimeSessionId 매핑 로그 제거(보상) */
  rollback(runtimeSessionId: string): Promise<void>;
}
