import { Processor, WorkerHost } from '@nestjs/bullmq';
import {
  ReservationJobUnion,
  ReservationJob,
  ReservationJobName,
} from './reservation-job.interface';
import { Injectable, Logger } from '@nestjs/common';
import { ReservationQueueUpcomingNotificationInHandler } from './reservation-queue-upcoming-notification.in-handler';

const LEGACY_START_EXTERNAL_RESERVATION_JOB = 'start-external-reservation';

@Processor('reservation')
@Injectable()
export class ReservationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReservationProcessor.name);

  constructor(
    private readonly queueUpcomingNotificationIn: ReservationQueueUpcomingNotificationInHandler,
  ) {
    super();
  }

  private readonly handlers: {
    [K in ReservationJobName]: (job: ReservationJob<K>) => Promise<void>;
  } = {
    sendUpcomingNotification: (job) => this.handleSendUpcomingNotification(job),
  };

  async process(job: ReservationJobUnion): Promise<void> {
    const jobName = job.name as string;

    if (jobName === LEGACY_START_EXTERNAL_RESERVATION_JOB) {
      this.logger.warn(
        'Ignoring deprecated reservation queue job start-external-reservation (handled on session queue).',
      );
      return;
    }

    const handler = this.handlers[jobName as ReservationJobName];
    if (!handler) {
      this.logger.error(`Unknown reservation job name: ${jobName}`);
      return;
    }

    return handler(job);
  }

  private async handleSendUpcomingNotification(
    job: ReservationJob<'sendUpcomingNotification'>,
  ): Promise<void> {
    await this.queueUpcomingNotificationIn.handleSendUpcomingNotification(
      job.data,
    );
  }
}
