import type { SessionLogRollbackRpcResponse } from 'src/contracts/rpc/session-log-rollback.rpc';
import type { SessionLogRollbackResult } from '../../../application/session-log-rollback.result';

export class SessionLogRollbackResponseMapper {
  static toRpc(
    result: SessionLogRollbackResult,
  ): SessionLogRollbackRpcResponse {
    return { deleted: result.deleted };
  }
}
