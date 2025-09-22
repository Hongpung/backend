import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SessionMessagingService } from 'src/features/session/application/services/session-messaging.service';
import { SessionOperationsService } from 'src/features/session/application/services/session-operations.service';
import { SessionDailyReservationsSyncService } from 'src/features/session/application/services/session-daily-reservations-sync.service';
import { SessionRuntimeManager } from 'src/features/session/application/runtime/session-runtime.manager';
import type { SessionDailyReservationSyncPayload } from '../../../domain/read-models/session-daily-reservation-sync.read-model';
import {
  SESSION_JOB_TYPE,
  SESSION_QUEUE_NAME,
  SessionJobData,
  SessionJobType,
} from './session-job.interface';
import type {
  ReservationSessionWirePayload,
  SessionWirePayload,
} from '../../session-wire-payload.type';
import { SessionEventPublisherPort } from 'src/features/session/application/ports/out/session-event-publisher.port';
import { SessionPushSnapshotMapper } from '../messaging/session-push-snapshot.mapper';
import {
  SessionReservationRemindPort,
  type SessionReservationRemindPort as ISessionReservationRemindPort,
} from '../../../application/ports/out/session-reservation-remind.port';

@Processor(SESSION_QUEUE_NAME)
export class SessionProcessor extends WorkerHost {
  private readonly logger = new Logger(SessionProcessor.name);

  constructor(
    private readonly sessionOperations: SessionOperationsService,
    private readonly sessionRuntimeManager: SessionRuntimeManager,
    @Inject(SessionEventPublisherPort)
    private readonly sessionEventPublisher: SessionEventPublisherPort,
    private readonly sessionMessaging: SessionMessagingService,
    private readonly sessionDailyReservationsSync: SessionDailyReservationsSyncService,
    @Inject(SessionReservationRemindPort)
    private readonly sessionReservationRemind: ISessionReservationRemindPort,
  ) {
    super();
  }

  async process(
    job: Job<SessionJobData[SessionJobType], unknown, SessionJobType>,
  ): Promise<void> {
    switch (job.name) {
      case SESSION_JOB_TYPE.FORCE_END_SESSION:
        return this.handleForceEndSession(
          job as Job<
            SessionWirePayload,
            unknown,
            typeof SESSION_JOB_TYPE.FORCE_END_SESSION
          >,
        );
      case SESSION_JOB_TYPE.FORCE_END_ALARM:
        return this.handleForceEndAlarm(
          job as Job<
            SessionWirePayload,
            unknown,
            typeof SESSION_JOB_TYPE.FORCE_END_ALARM
          >,
        );
      case SESSION_JOB_TYPE.SESSION_END_AVAILABLE:
      case SESSION_JOB_TYPE.SESSION_EXTEND_UNAVAILABLE:
        return this.handleSessionUseStateBoundary();
      case SESSION_JOB_TYPE.START_EXTERNAL_RESERVATION:
        return this.handleExternalReservationSession(
          job as Job<
            ReservationSessionWirePayload,
            unknown,
            typeof SESSION_JOB_TYPE.START_EXTERNAL_RESERVATION
          >,
        );
      case SESSION_JOB_TYPE.NO_SHOW_DISCARD_RESERVATION:
        return this.noShowDiscardReservationSession(
          job as Job<
            ReservationSessionWirePayload,
            unknown,
            typeof SESSION_JOB_TYPE.NO_SHOW_DISCARD_RESERVATION
          >,
        );
      case SESSION_JOB_TYPE.RESERVATION_START_REMIND:
        return this.handleReservationStartRemind(
          job as Job<
            { reservationId: number },
            unknown,
            typeof SESSION_JOB_TYPE.RESERVATION_START_REMIND
          >,
        );
      case SESSION_JOB_TYPE.SYNC_DAILY_RESERVATIONS:
        return this.handleSyncDailyReservations(
          job as Job<
            SessionDailyReservationSyncPayload,
            unknown,
            typeof SESSION_JOB_TYPE.SYNC_DAILY_RESERVATIONS
          >,
        );
      default:
        throw new Error(`Unknown job name: ${String(job.name)}`);
    }
  }

  private async handleForceEndSession(
    job: Job<
      SessionWirePayload,
      unknown,
      typeof SESSION_JOB_TYPE.FORCE_END_SESSION
    >,
  ): Promise<void> {
    this.logger.log('force-end triggered');
    const snapshot = SessionPushSnapshotMapper.fromWire(job.data);

    const result = await this.sessionOperations.handleForceEndSession({
      sessionId: snapshot.sessionId,
    });

    switch (result.status) {
      case 'success':
        if (result.sessionLogId !== undefined) {
          await this.sessionMessaging.notifyForceEnd(
            snapshot,
            result.sessionLogId,
          );
        }
        return;
      case 'skipped':
        this.logger.warn(
          `force-end job completed without action: ${result.skipReason} (sessionId=${snapshot.sessionId})`,
        );
        return;
      case 'failed':
        if (result.errorCode === 'SESSION_ID_MISMATCH') {
          throw new Error(
            `Force end failed: ${result.errorCode} (sessionId=${snapshot.sessionId})`,
          );
        }
        this.logger.warn(
          `force-end job completed with persist failure: ${result.errorCode} (sessionId=${snapshot.sessionId})`,
        );
        return;
    }
  }

  private handleSessionUseStateBoundary(): void {
    this.logger.log('session-use-state boundary triggered');
    this.sessionEventPublisher.publishSessionUpdate();
  }

  private async handleForceEndAlarm(
    job: Job<
      SessionWirePayload,
      unknown,
      typeof SESSION_JOB_TYPE.FORCE_END_ALARM
    >,
  ): Promise<void> {
    this.logger.log('force-end-alarm triggered');
    await this.sessionMessaging.notifyForceEndAlarm(
      SessionPushSnapshotMapper.fromWire(job.data),
    );
  }

  private async handleExternalReservationSession(
    job: Job<
      ReservationSessionWirePayload,
      unknown,
      typeof SESSION_JOB_TYPE.START_EXTERNAL_RESERVATION
    >,
  ): Promise<void> {
    this.logger.log('start-external-reservation triggered');
    const sessionData = job.data;
    await this.sessionRuntimeManager.startExternalReservationSession({
      sessionId: String(sessionData.sessionId),
      reservationId: sessionData.reservationId,
    });
  }

  private async handleReservationStartRemind(
    job: Job<
      { reservationId: number },
      unknown,
      typeof SESSION_JOB_TYPE.RESERVATION_START_REMIND
    >,
  ): Promise<void> {
    this.logger.log(
      `reservation-start-remind triggered for ${job.data.reservationId}`,
    );
    await this.sessionReservationRemind.sendUpcomingScheduleNotification(
      job.data.reservationId,
    );
  }

  private async handleSyncDailyReservations(
    job: Job<
      SessionDailyReservationSyncPayload,
      unknown,
      typeof SESSION_JOB_TYPE.SYNC_DAILY_RESERVATIONS
    >,
  ): Promise<void> {
    this.logger.log('sync-daily-reservations triggered');
    await this.sessionDailyReservationsSync.syncDailyReservations(job.data);
  }

  private async noShowDiscardReservationSession(
    job: Job<
      ReservationSessionWirePayload,
      unknown,
      typeof SESSION_JOB_TYPE.NO_SHOW_DISCARD_RESERVATION
    >,
  ): Promise<void> {
    const sessionData = job.data;
    const payload = {
      reservationId: sessionData.reservationId,
      sessionId: String(sessionData.sessionId),
    };

    await this.sessionRuntimeManager.applyNoShowDiscardReservation(payload);
    await this.sessionMessaging.notifyNoShowDiscard(
      SessionPushSnapshotMapper.fromWire(sessionData),
    );
  }
}
