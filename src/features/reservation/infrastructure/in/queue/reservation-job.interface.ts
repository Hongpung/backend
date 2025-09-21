import { Job } from 'bullmq';
import { ReservationSerializedDto } from './reservation-serialized.dto';

export type ReservationJobName = 'sendUpcomingNotification';

export interface ReservationJobData {
  sendUpcomingNotification: ReservationSerializedDto;
}

export type ReservationJob<K extends ReservationJobName = ReservationJobName> =
  Job<ReservationJobData[K], void, K>;

export type ReservationJobUnion = ReservationJob<'sendUpcomingNotification'>;

export type ReservationJobHandler = {
  [K in ReservationJobName]: (job: ReservationJob<K>) => Promise<void>;
};

export interface IReservationQueue {
  add<T extends ReservationJobName>(
    name: T,
    data: ReservationJobData[T],
    options?: {
      delay?: number;
      attempts?: number;
      backoff?: number | { type: 'fixed' | 'exponential'; delay: number };
      removeOnComplete?: boolean | number;
      removeOnFail?: boolean | number;
      jobId?: string | number;
    },
  ): Promise<unknown>;

  getJob(jobId: string | number): Promise<unknown>;
}
