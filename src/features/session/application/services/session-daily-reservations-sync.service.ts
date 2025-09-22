import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SessionDailyReservationSyncPayload } from '../../domain/read-models/session-daily-reservation-sync.read-model';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { SessionRuntimeManager } from '../runtime/session-runtime.manager';
import { ReservationSessionProps } from '../../domain/entities/reservation-session.entity';
import { ReservationStartWindowPolicy } from '../../domain/runtime/reservation-start-window.policy';
import type { SessionUser } from '../../domain/value-objects/session-user.vo';
import type { SessionReservationType } from '../../domain/value-objects/session-reservation-type.vo';
import type { SessionBriefInstrument } from '../../domain/value-objects/session-brief-instrument.vo';
import {
  SessionDailyReservationReadPort,
  type SessionDailyReservationReadPort as ISessionDailyReservationReadPort,
} from '../ports/out/session-daily-reservation-read.port';
import {
  SessionDailyReservationsSyncQueuePort,
  type SessionDailyReservationsSyncQueuePort as ISessionDailyReservationsSyncQueuePort,
} from '../ports/out/session-daily-reservations-sync-queue.port';

@Injectable()
export class SessionDailyReservationsSyncService {
  private readonly logger = new Logger(SessionDailyReservationsSyncService.name);

  constructor(
    @Inject(SessionDailyReservationReadPort)
    private readonly dailyReservationRead: ISessionDailyReservationReadPort,
    @Inject(SessionDailyReservationsSyncQueuePort)
    private readonly dailyReservationsSyncQueue: ISessionDailyReservationsSyncQueuePort,
    private readonly sessionRuntimeManager: SessionRuntimeManager,
  ) {}

  /** Scheduler: load today's reservations and enqueue Bull sync (optional wait). */
  async syncTodayReservations(options: {
    waitForCompletion: boolean;
  }): Promise<void> {
    const payload = await this.dailyReservationRead.findTodayForSessionSync();
    const calendarDateYmd = AppKstDateTime.kstTodayYmd();

    this.logger.log(
      `Enqueue daily session sync for ${calendarDateYmd} (${payload.length} reservations).`,
    );

    if (options.waitForCompletion) {
      await this.dailyReservationsSyncQueue.enqueueAndWait(
        payload,
        calendarDateYmd,
      );
      return;
    }

    await this.dailyReservationsSyncQueue.enqueue(payload, calendarDateYmd);
  }

  /** Processor: apply queued payload to in-memory session runtime. */
  async syncDailyReservations(
    payload: SessionDailyReservationSyncPayload,
  ): Promise<void> {
    this.logger.log(
      `Syncing ${payload.length} daily reservations into session runtime.`,
    );

    this.sessionRuntimeManager.clearSessions();

    if (payload.length === 0) {
      return;
    }

    const reservationSessionPropsList = this.toReservationSessionProps(payload);
    await this.sessionRuntimeManager.addReservationSessions(
      reservationSessionPropsList,
    );
  }

  private toReservationSessionProps(
    reservations: SessionDailyReservationSyncPayload,
  ): ReservationSessionProps[] {
    const nowMs = Date.now();

    return reservations.map((dto) => {
      const startTimeHHmm = AppKstDateTime.normalizeReservationTimeToHHmm(
        dto.startTime,
      );
      const startMs = AppKstDateTime.parseKstDateTime(
        dto.date,
        startTimeHHmm,
      ).getTime();

      const participators: SessionUser[] = dto.participators ?? [];
      const borrowInstruments: SessionBriefInstrument[] =
        dto.borrowInstruments ?? [];

      const stale = ReservationStartWindowPolicy.isStale({
        plannedStartMs: startMs,
        nowMs,
        compensation: false,
      });

      return {
        reservationId: dto.reservationId,
        reservationType: dto.reservationType as SessionReservationType,
        date: dto.date,
        startTime: startTimeHHmm,
        plannedStartTime: startTimeHHmm,
        endTime: AppKstDateTime.normalizeReservationTimeToHHmm(dto.endTime),
        title: dto.title,
        participationAvailable: dto.participationAvailable,
        creatorName: dto.creatorName,
        creatorId: dto.creatorId ?? undefined,
        creatorNickname: dto.creatorNickname ?? undefined,
        participators,
        participatorIds: dto.participators?.map((p) => p.memberId),
        borrowInstruments,
        status: stale ? 'DISCARDED' : 'BEFORE',
        attendanceList: participators.map((user) => ({
          user,
          status: '결석' as const,
        })),
      };
    });
  }
}
