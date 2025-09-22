import { Inject, Injectable } from '@nestjs/common';
import { RPC_KEY } from 'src/contracts/rpc/rpc-keys';
import type {
  SessionLogPersistRpcRequest,
  SessionLogPersistRpcResponse,
} from 'src/contracts/rpc/session-log-persist.rpc';
import type {
  SessionLogRollbackRpcRequest,
  SessionLogRollbackRpcResponse,
} from 'src/contracts/rpc/session-log-rollback.rpc';
import { RpcBusPort } from 'src/infrastructure/rpc/rpc-bus.port';
import { RpcTimeoutError } from 'src/infrastructure/rpc/rpc-timeout.error';
import {
  EndSessionRecordPort,
  type EndSessionRecordResult,
} from '../../../application/ports/out/end-session-record.port';
import { EndSessionRecordResponseMapper } from './end-session-record-response.mapper';

const SESSION_LOG_PERSIST_TIMEOUT_MS = 30_000;

@Injectable()
export class EndSessionRecordRpcClient implements EndSessionRecordPort {
  constructor(
    @Inject(RpcBusPort)
    private readonly rpcBus: RpcBusPort,
  ) {}

  async record(
    request: SessionLogPersistRpcRequest,
  ): Promise<EndSessionRecordResult> {
    try {
      const response = await this.rpcBus.request<
        SessionLogPersistRpcRequest,
        SessionLogPersistRpcResponse
      >(RPC_KEY.SESSION_LOG_PERSIST, request, {
        timeoutMs: SESSION_LOG_PERSIST_TIMEOUT_MS,
      });
      return EndSessionRecordResponseMapper.toPortResult(response);
    } catch (error) {
      if (error instanceof RpcTimeoutError) {
        return {
          status: 'failed',
          errorCode: 'SESSION_LOG_RPC_TIMEOUT',
        };
      }
      throw error;
    }
  }

  async rollback(runtimeSessionId: string): Promise<void> {
    await this.rpcBus.request<
      SessionLogRollbackRpcRequest,
      SessionLogRollbackRpcResponse
    >(RPC_KEY.SESSION_LOG_ROLLBACK, { runtimeSessionId });
  }
}
