import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { PersistSessionLogCommand } from './commands/persist-session-log.command';
import type { SessionLogDetailReadModel } from '../domain/read-models/session-log.read-model';
import type { SessionLogCommandRepositoryPort } from './ports/out/session-log-command.repository.port';
import { SessionLogPersistService } from './session-log-persist.service';

function buildCommand(): PersistSessionLogCommand {
  return {
    runtimeSessionId: 'rt-service-1',
    date: new Date('2026-04-22T00:00:00.000Z'),
    startTime: new Date('2026-04-22T01:00:00.000Z'),
    endTime: new Date('2026-04-22T02:00:00.000Z'),
    creatorId: 1,
    title: 'Daily practice',
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
    title: 'Daily practice',
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

describe('SessionLogPersistService', () => {
  let commandRepo: jest.Mocked<
    Pick<SessionLogCommandRepositoryPort, 'persistSessionFromSnapshot'>
  >;
  let service: SessionLogPersistService;

  beforeEach(() => {
    commandRepo = {
      persistSessionFromSnapshot: jest.fn(),
    };
    service = new SessionLogPersistService(
      commandRepo as unknown as SessionLogCommandRepositoryPort,
    );
  });

  it('persist 성공 시 read model을 그대로 반환한다', async () => {
    const detail = buildDetailReadModel();
    commandRepo.persistSessionFromSnapshot.mockResolvedValue(detail);

    const result = await service.persistFromSnapshot(buildCommand());

    expect(result).toEqual({
      status: 'created',
      sessionLog: detail,
    });
  });

  it('EXTERNAL 예약은 repository 없이 skipped read model을 반환한다', async () => {
    const command = buildCommand();
    command.reservationType = 'EXTERNAL';

    const result = await service.persistFromSnapshot(command);

    expect(commandRepo.persistSessionFromSnapshot).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'skipped',
      skipReason: 'EXTERNAL_RESERVATION',
    });
  });

  it('REALTIME 빈 attendanceList는 failed read model을 반환한다', async () => {
    const command = buildCommand();
    command.sessionType = 'REALTIME';
    command.attendanceList = [];

    const result = await service.persistFromSnapshot(command);

    expect(commandRepo.persistSessionFromSnapshot).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'failed',
      errorCode: 'SESSION_LOG_PERSIST_FAILED',
    });
  });

  it('repository 예외 시 failed read model을 반환한다', async () => {
    commandRepo.persistSessionFromSnapshot.mockRejectedValue(
      new Error('db error'),
    );

    const result = await service.persistFromSnapshot(buildCommand());

    expect(result).toEqual({
      status: 'failed',
      errorCode: 'SESSION_LOG_PERSIST_FAILED',
    });
  });
});
