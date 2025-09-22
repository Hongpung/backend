import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationSession } from '../../domain/entities/reservation-session.entity';
import { SessionDomainService } from '../../domain/runtime/session-domain.service';
import { ReservationStartWindowPolicy } from '../../domain/runtime/reservation-start-window.policy';
import {
  SESSION_JOB_PORT,
  SessionJobPort,
} from '../ports/out/session-job.port';
import { SessionRuntimeManager } from '../runtime/session-runtime.manager';
import { SessionMessagingService } from './session-messaging.service';
import {
  SessionReservationStartRemindQueuePort,
  type SessionReservationStartRemindQueuePort as ISessionReservationStartRemindQueuePort,
} from '../ports/out/session-reservation-start-remind-queue.port';

const RESERVATION_START_REMIND_MS = 15 * 60 * 1000;

@Injectable()
export class SessionReservationTimedJobsService {
  private readonly logger = new Logger(SessionReservationTimedJobsService.name);

  constructor(
    private readonly sessionRuntimeManager: SessionRuntimeManager,
    private readonly sessionDomainService: SessionDomainService,
    @Inject(SESSION_JOB_PORT)
    private readonly sessionJobPort: SessionJobPort,
    @Inject(SessionReservationStartRemindQueuePort)
    private readonly startRemindQueue: ISessionReservationStartRemindQueuePort,
    private readonly sessionMessaging: SessionMessagingService,
  ) {}

  /** 당일 sync·restore 이후: 15분 전 알림, 노쇼 폐기, 외부 예약 자동 시작 job. */
  async scheduleTodayReservationTimedJobs(): Promise<void> {
    const sessions =
      this.sessionRuntimeManager.getBeforeReservationSessions();

    await Promise.all([
      this.scheduleStartRemindJobs(sessions),
      this.scheduleNoShowAndExternalJobs(sessions),
    ]);
  }

  private async scheduleStartRemindJobs(
    sessions: ReservationSession[],
  ): Promise<void> {
    const nowMs = Date.now();

    await Promise.all(
      sessions.map(async (session) => {
        if (
          session.reservationType === 'EXTERNAL' ||
          session.reservationId == null
        ) {
          return;
        }

        const delay =
          ReservationStartWindowPolicy.plannedStartMs(session) -
          nowMs -
          RESERVATION_START_REMIND_MS;

        if (delay <= 0) {
          this.logger.log(
            `Skip start remind for reservation ${session.reservationId}: already past remind window`,
          );
          return;
        }

        await this.startRemindQueue.enqueue(session.reservationId, delay);
      }),
    );
  }

  private async scheduleNoShowAndExternalJobs(
    sessions: ReservationSession[],
  ): Promise<void> {
    await Promise.all(
      sessions.map(async (session) => {
        if (session.reservationType === 'EXTERNAL') {
          const utcTime = new Date();
          const delay = AppKstDateTime.msUntilKstWallInstant(
            session.date,
            session.startTime,
            utcTime.getTime(),
          );

          await this.sessionJobPort.removeStartExternalReservationJob(
            session.sessionId,
          );
          if (delay > 0) {
            await this.sessionJobPort.addStartExternalReservationJob(
              session.sessionId,
              session,
              delay,
            );
          }
          return;
        }

        const compensation = this.discardCompensationFor(session);
        const delay = this.sessionDomainService.calculateDiscardDelay(
          session,
          compensation,
        );

        await this.sessionJobPort.removeNoShowDiscardJob(session.sessionId);

        if (delay > 0) {
          await this.sessionJobPort.addNoShowDiscardJob(
            session.sessionId,
            session,
            delay,
          );
          return;
        }

        if (
          session.status === 'BEFORE' &&
          ReservationStartWindowPolicy.isStale({
            plannedStartMs: ReservationStartWindowPolicy.plannedStartMs(session),
            nowMs: Date.now(),
            compensation,
          })
        ) {
          await this.sessionRuntimeManager.applyNoShowDiscardReservation({
            reservationId: session.reservationId,
            sessionId: String(session.sessionId),
          });
          await this.sessionMessaging.notifyNoShowDiscardForReservation(session);
        }
      }),
    );
  }

  private discardCompensationFor(reservation: ReservationSession): boolean {
    const onAir = this.sessionRuntimeManager
      .getSessionListStatus()
      .find((s) => s.status === 'ONAIR');
    return ReservationStartWindowPolicy.compensationApplies({
      currentOnAir: onAir ?? null,
      nextReservation: reservation,
    });
  }
}
