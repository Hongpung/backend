import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Job, Queue, QueueEvents } from 'bullmq';
import type { SessionDailyReservationSyncPayload } from '../../../domain/read-models/session-daily-reservation-sync.read-model';
import { SessionDailyReservationsSyncQueuePort } from '../../../application/ports/out/session-daily-reservations-sync-queue.port';
import {
  SESSION_JOB_TYPE,
  SESSION_QUEUE_NAME,
  syncDailyReservationsJobId,
} from './session-job.interface';

const SYNC_JOB_WAIT_MS = 120_000;

@Injectable()
export class SessionDailyReservationsSyncQueueAdapter
  implements SessionDailyReservationsSyncQueuePort, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    SessionDailyReservationsSyncQueueAdapter.name,
  );
  private queueEvents!: QueueEvents;

  constructor(
    @InjectQueue(SESSION_QUEUE_NAME) private readonly queue: Queue,
  ) {}

  onModuleInit(): void {
    this.queueEvents = new QueueEvents(SESSION_QUEUE_NAME, {
      connection: this.queue.opts.connection,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queueEvents.close();
  }

  async enqueueAndWait(
    payload: SessionDailyReservationSyncPayload,
    calendarDateYmd: string,
  ): Promise<void> {
    const job = await this.addSyncJob(payload, calendarDateYmd);
    await this.waitForJob(job);
  }

  async enqueue(
    payload: SessionDailyReservationSyncPayload,
    calendarDateYmd: string,
  ): Promise<void> {
    await this.addSyncJob(payload, calendarDateYmd);
  }

  private async addSyncJob(
    payload: SessionDailyReservationSyncPayload,
    calendarDateYmd: string,
  ): Promise<Job<SessionDailyReservationSyncPayload>> {
    const jobId = syncDailyReservationsJobId(calendarDateYmd);
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'completed' || state === 'failed') {
        await existing.remove();
      } else if (state === 'active' || state === 'waiting' || state === 'delayed') {
        this.logger.log(
          `Reusing in-flight daily sync job ${jobId} (state=${state})`,
        );
        return existing as Job<SessionDailyReservationSyncPayload>;
      }
    }

    const job = await this.queue.add(
      SESSION_JOB_TYPE.SYNC_DAILY_RESERVATIONS,
      payload,
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        // waitUntilFinished가 완료 직후 isFinished를 읽으므로 즉시 삭제하면 안 됨
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    );

    this.logger.log(`Enqueued daily reservation sync job ${job.id}`);
    return job as Job<SessionDailyReservationSyncPayload>;
  }

  private async waitForJob(job: Job): Promise<void> {
    try {
      await this.queueEvents.waitUntilReady();
      await job.waitUntilFinished(this.queueEvents, SYNC_JOB_WAIT_MS);
    } catch (error) {
      this.logger.error(`Daily reservation sync job ${job.id} failed`, error);
      throw error;
    }
  }
}
