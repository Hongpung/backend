import { Injectable, Inject, Logger } from '@nestjs/common';
import type { PersistSessionLogCommand } from './commands/persist-session-log.command';
import {
  SessionLogCommandRepositoryPort,
  type SessionLogCommandRepositoryPort as ISessionLogCommandRepositoryPort,
} from './ports/out/session-log-command.repository.port';
import type { SessionLogPersistResult } from './session-log-persist.result';

@Injectable()
export class SessionLogPersistService {
  private readonly logger = new Logger(SessionLogPersistService.name);

  constructor(
    @Inject(SessionLogCommandRepositoryPort)
    private readonly commandRepo: ISessionLogCommandRepositoryPort,
  ) {}

  async persistFromSnapshot(
    command: PersistSessionLogCommand,
  ): Promise<SessionLogPersistResult> {
    if (
      command.sessionType === 'RESERVED' &&
      command.reservationType === 'EXTERNAL'
    ) {
      return {
        status: 'skipped',
        skipReason: 'EXTERNAL_RESERVATION',
      };
    }

    const payload = this.normalizeCommand(command);

    if (
      payload.sessionType === 'REALTIME' &&
      payload.attendanceList.length === 0
    ) {
      this.logger.error(
        `Persist rejected: REALTIME snapshot has empty attendanceList (runtimeSessionId=${payload.runtimeSessionId})`,
      );
      return {
        status: 'failed',
        errorCode: 'SESSION_LOG_PERSIST_FAILED',
      };
    }

    try {
      const detail = await this.commandRepo.persistSessionFromSnapshot(payload);

      return {
        status: 'created',
        sessionLog: detail,
      };
    } catch (error) {
      this.logger.error('Failed to persist session log from snapshot', error);
      return {
        status: 'failed',
        errorCode: 'SESSION_LOG_PERSIST_FAILED',
      };
    }
  }

  private normalizeCommand(
    command: PersistSessionLogCommand,
  ): PersistSessionLogCommand {
    const payload = { ...command };
    payload.date = new Date(payload.date);
    payload.startTime = new Date(payload.startTime);
    payload.endTime = new Date(payload.endTime);
    payload.attendanceList = payload.attendanceList.map((att) => ({
      ...att,
      timeStamp: new Date(att.timeStamp),
    }));
    return payload;
  }
}
