import { Injectable, Inject } from '@nestjs/common';
import type { SessionLogRollbackResult } from './session-log-rollback.result';
import {
  SessionLogCommandRepositoryPort,
  type SessionLogCommandRepositoryPort as ISessionLogCommandRepositoryPort,
} from './ports/out/session-log-command.repository.port';

@Injectable()
export class SessionLogRollbackService {
  constructor(
    @Inject(SessionLogCommandRepositoryPort)
    private readonly commandRepo: ISessionLogCommandRepositoryPort,
  ) {}

  async rollbackByRuntimeSessionId(
    runtimeSessionId: string,
  ): Promise<SessionLogRollbackResult> {
    const deleted =
      await this.commandRepo.deleteByRuntimeSessionId(runtimeSessionId);
    return { deleted };
  }
}
