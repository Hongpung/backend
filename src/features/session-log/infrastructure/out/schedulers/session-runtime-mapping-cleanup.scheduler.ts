import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SessionRuntimeMappingCleanupService } from '../../../application/session-runtime-mapping-cleanup.service';

/** 매일 03:00(KST)에 SessionRuntimeMapping 전체를 비운다. */
@Injectable()
export class SessionRuntimeMappingCleanupScheduler {
  private readonly logger = new Logger(
    SessionRuntimeMappingCleanupScheduler.name,
  );

  constructor(
    private readonly cleanup: SessionRuntimeMappingCleanupService,
  ) {}

  @Cron('0 0 3 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async purgeSessionRuntimeMappings(): Promise<void> {
    this.logger.log('Starting daily session runtime mapping purge.');
    await this.cleanup.purgeAllMappings();
  }
}
