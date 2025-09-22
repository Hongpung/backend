import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { RPC_KEY } from 'src/contracts/rpc/rpc-keys';
import type {
  SessionLogRollbackRpcRequest,
  SessionLogRollbackRpcResponse,
} from 'src/contracts/rpc/session-log-rollback.rpc';
import { RpcBusPort } from 'src/infrastructure/rpc/rpc-bus.port';
import { SessionLogRollbackService } from '../../../application/session-log-rollback.service';
import { SessionLogRollbackResponseMapper } from './session-log-rollback-response.mapper';

@Injectable()
export class SessionLogRollbackRpcHandler implements OnModuleInit {
  constructor(
    @Inject(RpcBusPort)
    private readonly rpcBus: RpcBusPort,
    private readonly rollbackService: SessionLogRollbackService,
  ) {}

  onModuleInit(): void {
    this.rpcBus.register<
      SessionLogRollbackRpcRequest,
      SessionLogRollbackRpcResponse
    >(RPC_KEY.SESSION_LOG_ROLLBACK, async (payload) =>
      SessionLogRollbackResponseMapper.toRpc(
        await this.rollbackService.rollbackByRuntimeSessionId(
          payload.runtimeSessionId,
        ),
      ),
    );
  }
}
