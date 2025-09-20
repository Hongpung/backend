import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import dayjs from 'dayjs';
import { Inject } from '@nestjs/common';
import {
  MemberAuthSessionRepositoryPort,
  type IMemberAuthSessionRepository,
} from '../../../application/ports/out/member-auth-session.repository.port';

@Injectable()
export class MemberAuthRefreshTokenCleanupSchedulerService {
  private readonly logger = new Logger(
    MemberAuthRefreshTokenCleanupSchedulerService.name,
  );

  constructor(
    @Inject(MemberAuthSessionRepositoryPort)
    private readonly sessionRepository: IMemberAuthSessionRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupStaleRefreshTokens(): Promise<void> {
    const cutoff = dayjs().subtract(7, 'day').toDate();
    const deleted =
      await this.sessionRepository.deleteStaleRefreshTokensOlderThan(cutoff);
    this.logger.log(`Stale MemberRefreshToken rows deleted: ${deleted}`);
  }
}
