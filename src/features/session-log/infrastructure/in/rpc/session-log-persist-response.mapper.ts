import type { SessionLogPersistRpcResponse } from 'src/contracts/rpc/session-log-persist.rpc';
import type { SessionLogPersistResult } from '../../../application/session-log-persist.result';
import { SessionLogDetailRpcMapper } from '../../out/rpc/session-log-detail.rpc.mapper';

export class SessionLogPersistResponseMapper {
  static toRpc(result: SessionLogPersistResult): SessionLogPersistRpcResponse {
    if (result.status === 'created') {
      return {
        status: 'created',
        sessionLog: SessionLogDetailRpcMapper.toRpc(result.sessionLog),
      };
    }
    return result;
  }
}
