import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { RPC_KEY } from 'src/contracts/rpc/rpc-keys';
import type { SessionLogRollbackRpcRequest } from 'src/contracts/rpc/session-log-rollback.rpc';
import { RpcBusPort } from 'src/infrastructure/rpc/rpc-bus.port';
import { InProcessRpcBus } from 'src/infrastructure/rpc/in-process-rpc.bus';
import { SessionLogRollbackService } from '../../../application/session-log-rollback.service';
import { SessionLogCommandRepositoryPort } from '../../../application/ports/out/session-log-command.repository.port';
import { SessionLogRollbackRpcHandler } from './session-log-rollback.rpc-handler';

function buildRpcRequest(
  runtimeSessionId = 'rt-rollback-rpc-1',
): SessionLogRollbackRpcRequest {
  return { runtimeSessionId };
}

describe('SessionLogRollbackRpcHandler', () => {
  let moduleRef: TestingModule;
  let rpcBus: InProcessRpcBus;
  let commandRepo: {
    deleteByRuntimeSessionId: jest.Mock<(runtimeSessionId: string) => Promise<boolean>>;
    persistSessionFromSnapshot: jest.Mock;
  };

  beforeEach(async () => {
    commandRepo = {
      deleteByRuntimeSessionId: jest.fn(),
      persistSessionFromSnapshot: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        { provide: RpcBusPort, useClass: InProcessRpcBus },
        SessionLogRollbackService,
        SessionLogRollbackRpcHandler,
        {
          provide: SessionLogCommandRepositoryPort,
          useValue: commandRepo,
        },
      ],
    }).compile();

    await moduleRef.init();

    rpcBus = moduleRef.get<InProcessRpcBus>(RpcBusPort);
  });

  it('onModuleInit 후 SESSION_LOG_ROLLBACK RPC round-trip이 deleted=true를 반환한다', async () => {
    commandRepo.deleteByRuntimeSessionId.mockResolvedValue(true);

    const payload = buildRpcRequest();
    const response = await rpcBus.request(RPC_KEY.SESSION_LOG_ROLLBACK, payload);

    expect(commandRepo.deleteByRuntimeSessionId).toHaveBeenCalledWith(
      payload.runtimeSessionId,
    );
    expect(response).toEqual({ deleted: true });
  });

  it('매핑 없음 시 SESSION_LOG_ROLLBACK RPC round-trip이 deleted=false를 반환한다', async () => {
    commandRepo.deleteByRuntimeSessionId.mockResolvedValue(false);

    const payload = buildRpcRequest('rt-missing');
    const response = await rpcBus.request(RPC_KEY.SESSION_LOG_ROLLBACK, payload);

    expect(commandRepo.deleteByRuntimeSessionId).toHaveBeenCalledWith(
      'rt-missing',
    );
    expect(response).toEqual({ deleted: false });
  });
});
