import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventEmitterReadinessWatcher } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionDailyReservationsSyncService } from '../../../application/services/session-daily-reservations-sync.service';
import { SessionReservationTimedJobsService } from '../../../application/services/session-reservation-timed-jobs.service';
import { SessionRuntimeBootstrap } from '../bootstrap/session-runtime.bootstrap';

/**
 * 세션 리스트 동기화·Firestore restore·예약 세션 타이머 job(15분 전 알림·노쇼·외부 시작) 담당.
 */
@Injectable()
export class SessionSchedulerService implements OnApplicationBootstrap {
  constructor(
    private readonly dailyReservationsSync: SessionDailyReservationsSyncService,
    private readonly reservationTimedJobs: SessionReservationTimedJobsService,
    private readonly eventEmitterReadinessWatcher: EventEmitterReadinessWatcher,
    private readonly sessionRuntimeBootstrap: SessionRuntimeBootstrap,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.eventEmitterReadinessWatcher.waitUntilReady();
    await this.runDailySessionPipeline();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Seoul',
  })
  async handleMidnightCron(): Promise<void> {
    await this.runDailySessionPipeline({ skipRestore: true });
  }

  private async runDailySessionPipeline(options?: {
    skipRestore?: boolean;
  }): Promise<void> {
    await this.dailyReservationsSync.syncTodayReservations({
      waitForCompletion: true,
    });

    if (!options?.skipRestore) {
      await this.sessionRuntimeBootstrap.restore();
    }

    await this.reservationTimedJobs.scheduleTodayReservationTimedJobs();
  }
}
