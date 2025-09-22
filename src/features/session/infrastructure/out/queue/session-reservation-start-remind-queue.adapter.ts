import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { SessionReservationStartRemindQueuePort } from '../../../application/ports/out/session-reservation-start-remind-queue.port';
import { SESSION_JOB_TYPE, SESSION_QUEUE_NAME } from './session-job.interface';

@Injectable()
export class SessionReservationStartRemindQueueAdapter
  implements SessionReservationStartRemindQueuePort
{
  private readonly logger = new Logger(
    SessionReservationStartRemindQueueAdapter.name,
  );

  constructor(
    @InjectQueue(SESSION_QUEUE_NAME) private readonly sessionQueue: Queue,
  ) {}

  async enqueue(reservationId: number, delayMs: number): Promise<void> {
    const jobId = `reservation-start-remind-${reservationId}`;
    const existing = await this.sessionQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'waiting' || state === 'delayed' || state === 'active') {
        return;
      }
      await existing.remove();
    }

    await this.sessionQueue.add(
      SESSION_JOB_TYPE.RESERVATION_START_REMIND,
      { reservationId },
      {
        delay: delayMs,
        attempts: 3,
        backoff: 5000,
        removeOnFail: true,
        removeOnComplete: true,
        jobId,
      },
    );

    this.logger.log(
      `Scheduled reservation start remind for ${reservationId} (delay=${delayMs}ms)`,
    );
  }
}
