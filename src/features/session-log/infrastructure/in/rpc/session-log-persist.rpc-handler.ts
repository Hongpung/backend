import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { RPC_KEY } from 'src/contracts/rpc/rpc-keys';
import type {
  SessionLogPersistRpcRequest,
  SessionLogPersistRpcResponse,
} from 'src/contracts/rpc/session-log-persist.rpc';
import { RpcBusPort } from 'src/infrastructure/rpc/rpc-bus.port';
import { SessionLogPersistService } from '../../../application/session-log-persist.service';
import { SessionLogPersistRequestMapper } from './session-log-persist-request.mapper';
import { SessionLogPersistResponseMapper } from './session-log-persist-response.mapper';

@Injectable()
export class SessionLogPersistRpcHandler implements OnModuleInit {
  constructor(
    @Inject(RpcBusPort)
    private readonly rpcBus: RpcBusPort,
    private readonly persistService: SessionLogPersistService,
  ) {}

  onModuleInit(): void {
    this.rpcBus.register<
      SessionLogPersistRpcRequest,
      SessionLogPersistRpcResponse
    >(RPC_KEY.SESSION_LOG_PERSIST, async (payload) =>
      SessionLogPersistResponseMapper.toRpc(
        await this.persistService.persistFromSnapshot(
          SessionLogPersistRequestMapper.toCommand(payload),
        ),
      ),
    );
  }
}
