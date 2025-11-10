import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SessionLogCommandRepositoryPort } from './ports/out/session-log-command.repository.port';
import { SessionLogRollbackService } from './session-log-rollback.service';

describe('SessionLogRollbackService', () => {
  let commandRepo: jest.Mocked<
    Pick<SessionLogCommandRepositoryPort, 'deleteByRuntimeSessionId'>
  >;
  let service: SessionLogRollbackService;

  beforeEach(() => {
    commandRepo = {
      deleteByRuntimeSessionId: jest.fn(),
    };
    service = new SessionLogRollbackService(
      commandRepo as unknown as SessionLogCommandRepositoryPort,
    );
  });

  it('삭제 성공 시 deleted=true result를 반환한다', async () => {
    commandRepo.deleteByRuntimeSessionId.mockResolvedValue(true);

    const result = await service.rollbackByRuntimeSessionId('rt-rollback-1');

    expect(commandRepo.deleteByRuntimeSessionId).toHaveBeenCalledWith(
      'rt-rollback-1',
    );
    expect(result).toEqual({ deleted: true });
  });

  it('매핑 없음 시 deleted=false result를 반환한다', async () => {
    commandRepo.deleteByRuntimeSessionId.mockResolvedValue(false);

    const result = await service.rollbackByRuntimeSessionId('rt-missing');

    expect(result).toEqual({ deleted: false });
  });
});
