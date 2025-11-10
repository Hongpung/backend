import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { RPC_KEY } from 'src/contracts/rpc/rpc-keys';
import type { SessionLogPersistRpcRequest } from 'src/contracts/rpc/session-log-persist.rpc';
import { RpcBusPort } from 'src/infrastructure/rpc/rpc-bus.port';
import { InProcessRpcBus } from 'src/infrastructure/rpc/in-process-rpc.bus';
import { SessionLogPersistService } from '../../../application/session-log-persist.service';
import { SessionLogCommandRepositoryPort } from '../../../application/ports/out/session-log-command.repository.port';
import type { PersistSessionLogCommand } from '../../../application/commands/persist-session-log.command';
import type { SessionLogDetailReadModel } from '../../../domain/read-models/session-log.read-model';
import { SessionLogPersistRpcHandler } from './session-log-persist.rpc-handler';

function buildRpcRequest(): SessionLogPersistRpcRequest {
  return {
    runtimeSessionId: 'rt-rpc-1',
    date: new Date('2026-04-22T00:00:00.000Z'),
    startTime: new Date('2026-04-22T01:00:00.000Z'),
    endTime: new Date('2026-04-22T02:00:00.000Z'),
    creatorId: 1,
    title: 'Practice',
    sessionType: 'RESERVED',
    reservationType: 'REGULAR',
    reservationId: 10,
    extendCount: 0,
    participationAvailable: true,
    returnImageUrl: null,
    forceEnd: false,
    attendanceList: [
      {
        memberId: 2,
        status: '참가',
        timeStamp: new Date('2026-04-22T01:30:00.000Z'),
      },
    ],
    borrowInstruments: [],
  };
}

function buildDetailReadModel(): SessionLogDetailReadModel {
  return {
    sessionId: 42,
    creatorId: 1,
    creatorName: 'Creator',
    creatorNickname: null,
    title: 'Practice',
    date: '2026-04-22',
    startTime: '2026-04-22T01:00:00.000Z',
    endTime: '2026-04-22T02:00:00.000Z',
    sessionType: 'RESERVED',
    reservationType: 'REGULAR',
    participationAvailable: true,
    forceEnd: false,
    attendeeCount: 1,
    extendCount: 0,
    returnImageUrl: null,
    reservationId: 10,
    attendanceList: [],
    borrowInstruments: [],
  };
}

describe('SessionLogPersistRpcHandler', () => {
  let moduleRef: TestingModule;
  let rpcBus: InProcessRpcBus;
  let commandRepo: {
    persistSessionFromSnapshot: jest.Mock<
      (command: PersistSessionLogCommand) => Promise<SessionLogDetailReadModel>
    >;
    deleteByRuntimeSessionId: jest.Mock;
  };

  beforeEach(async () => {
    commandRepo = {
      persistSessionFromSnapshot: jest.fn(),
      deleteByRuntimeSessionId: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        { provide: RpcBusPort, useClass: InProcessRpcBus },
        SessionLogPersistService,
        SessionLogPersistRpcHandler,
        {
          provide: SessionLogCommandRepositoryPort,
          useValue: commandRepo,
        },
      ],
    }).compile();

    await moduleRef.init();

    rpcBus = moduleRef.get<InProcessRpcBus>(RpcBusPort);
  });

  it('onModuleInit 후 SESSION_LOG_PERSIST RPC round-trip이 created를 반환한다', async () => {
    const detail = buildDetailReadModel();
    commandRepo.persistSessionFromSnapshot.mockResolvedValue(detail);

    const payload = buildRpcRequest();
    const response = await rpcBus.request(RPC_KEY.SESSION_LOG_PERSIST, payload);

    expect(commandRepo.persistSessionFromSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeSessionId: payload.runtimeSessionId,
        title: payload.title,
      }),
    );
    expect(response).toEqual({
      status: 'created',
      sessionLog: expect.objectContaining({
        sessionId: 42,
        title: 'Practice',
      }),
    });
  });

  it('EXTERNAL 예약은 repository 없이 skipped를 반환한다', async () => {
    const payload = buildRpcRequest();
    payload.reservationType = 'EXTERNAL';

    const response = await rpcBus.request(RPC_KEY.SESSION_LOG_PERSIST, payload);

    expect(commandRepo.persistSessionFromSnapshot).not.toHaveBeenCalled();
    expect(response).toEqual({
      status: 'skipped',
      skipReason: 'EXTERNAL_RESERVATION',
    });
  });

  it('REALTIME 빈 attendanceList는 failed RPC response를 반환한다', async () => {
    const payload = buildRpcRequest();
    payload.sessionType = 'REALTIME';
    payload.attendanceList = [];

    const response = await rpcBus.request(RPC_KEY.SESSION_LOG_PERSIST, payload);

    expect(commandRepo.persistSessionFromSnapshot).not.toHaveBeenCalled();
    expect(response).toEqual({
      status: 'failed',
      errorCode: 'SESSION_LOG_PERSIST_FAILED',
    });
  });
});
