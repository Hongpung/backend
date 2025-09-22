import type { SessionLogPersistRpcRequest } from 'src/contracts/rpc/session-log-persist.rpc';
import type { PersistSessionLogCommand } from '../../../application/commands/persist-session-log.command';

export class SessionLogPersistRequestMapper {
  static toCommand(
    request: SessionLogPersistRpcRequest,
  ): PersistSessionLogCommand {
    return { ...request };
  }
}
