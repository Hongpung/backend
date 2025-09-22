import type { SessionLogPersistRpcResponse } from 'src/contracts/rpc/session-log-persist.rpc';
import type { EndSessionRecordResult } from '../../../application/ports/out/end-session-record.port';
import { SessionLogDetailRpcMapper } from './session-log-detail.rpc.mapper';

export class EndSessionRecordResponseMapper {
  static toPortResult(
    response: SessionLogPersistRpcResponse,
  ): EndSessionRecordResult {
    if (response.status === 'created') {
      return {
        status: 'created',
        sessionLog: SessionLogDetailRpcMapper.toReadModel(response.sessionLog),
      };
    }
    return response;
  }
}
