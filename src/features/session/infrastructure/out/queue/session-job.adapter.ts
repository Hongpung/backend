import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  addSessionJob,
  removeSessionJob,
  rescheduleSessionJob,
} from './session-job.utils';
import { SESSION_JOB_TYPE, SESSION_QUEUE_NAME } from './session-job.interface';
import type {
  ForceEndJobData,
  ReservationOnlyJobData,
  SessionJobPort,
} from '../../../application/ports/out/session-job.port';
import { SessionJobPayloadMapper } from './mappers/session-job-payload.mapper';

@Injectable()
export class SessionJobAdapter implements SessionJobPort {
  constructor(@InjectQueue(SESSION_QUEUE_NAME) private readonly queue: Queue) {}

  async addForceEndJob(
    sessionId: string,
    data: ForceEndJobData,
    delayMs: number,
  ): Promise<void> {
    await addSessionJob(
      this.queue,
      SESSION_JOB_TYPE.FORCE_END_SESSION,
      sessionId,
      SessionJobPayloadMapper.toForceEndPayload(data),
      delayMs,
      { attempts: 3, backoffMs: 1000 },
    );
  }

  async addForceEndAlarmJob(
    sessionId: string,
    data: ForceEndJobData,
    delayMs: number,
  ): Promise<void> {
    await addSessionJob(
      this.queue,
      SESSION_JOB_TYPE.FORCE_END_ALARM,
      sessionId,
      SessionJobPayloadMapper.toForceEndPayload(data),
      delayMs,
    );
  }

  async removeForceEndJob(sessionId: string): Promise<void> {
    await removeSessionJob(
      this.queue,
      SESSION_JOB_TYPE.FORCE_END_SESSION,
      sessionId,
    );
  }

  async removeForceEndAlarmJob(sessionId: string): Promise<void> {
    await removeSessionJob(
      this.queue,
      SESSION_JOB_TYPE.FORCE_END_ALARM,
      sessionId,
    );
  }

  async removeAllSessionEndTimedJobs(sessionId: string | number): Promise<void> {
    const id = String(sessionId);
    await Promise.all([
      this.removeForceEndJob(id),
      this.removeForceEndAlarmJob(id),
      this.removeSessionEndAvailableJob(id),
      this.removeSessionExtendUnavailableJob(id),
    ]);
  }

  async rescheduleForceEndJob(
    sessionId: string,
    data: ForceEndJobData,
    delayMs: number,
  ): Promise<void> {
    await rescheduleSessionJob(
      this.queue,
      SESSION_JOB_TYPE.FORCE_END_SESSION,
      sessionId,
      SessionJobPayloadMapper.toForceEndPayload(data),
      delayMs,
    );
  }

  async addSessionEndAvailableJob(
    sessionId: string,
    data: ForceEndJobData,
    delayMs: number,
  ): Promise<void> {
    await addSessionJob(
      this.queue,
      SESSION_JOB_TYPE.SESSION_END_AVAILABLE,
      sessionId,
      SessionJobPayloadMapper.toForceEndPayload(data),
      delayMs,
    );
  }

  async addSessionExtendUnavailableJob(
    sessionId: string,
    data: ForceEndJobData,
    delayMs: number,
  ): Promise<void> {
    await addSessionJob(
      this.queue,
      SESSION_JOB_TYPE.SESSION_EXTEND_UNAVAILABLE,
      sessionId,
      SessionJobPayloadMapper.toForceEndPayload(data),
      delayMs,
    );
  }

  async removeSessionEndAvailableJob(sessionId: string): Promise<void> {
    await removeSessionJob(
      this.queue,
      SESSION_JOB_TYPE.SESSION_END_AVAILABLE,
      sessionId,
    );
  }

  async removeSessionExtendUnavailableJob(sessionId: string): Promise<void> {
    await removeSessionJob(
      this.queue,
      SESSION_JOB_TYPE.SESSION_EXTEND_UNAVAILABLE,
      sessionId,
    );
  }

  async rescheduleSessionExtendUnavailableJob(
    sessionId: string,
    data: ForceEndJobData,
    delayMs: number,
  ): Promise<void> {
    await rescheduleSessionJob(
      this.queue,
      SESSION_JOB_TYPE.SESSION_EXTEND_UNAVAILABLE,
      sessionId,
      SessionJobPayloadMapper.toForceEndPayload(data),
      delayMs,
    );
  }

  async addNoShowDiscardJob(
    sessionId: string,
    data: ReservationOnlyJobData,
    delayMs: number,
  ): Promise<void> {
    await addSessionJob(
      this.queue,
      SESSION_JOB_TYPE.NO_SHOW_DISCARD_RESERVATION,
      sessionId,
      SessionJobPayloadMapper.toReservationPayload(data),
      delayMs,
    );
  }

  async removeNoShowDiscardJob(sessionId: string): Promise<void> {
    await removeSessionJob(
      this.queue,
      SESSION_JOB_TYPE.NO_SHOW_DISCARD_RESERVATION,
      sessionId,
    );
  }

  async addStartExternalReservationJob(
    sessionId: string,
    data: ReservationOnlyJobData,
    delayMs: number,
  ): Promise<void> {
    await addSessionJob(
      this.queue,
      SESSION_JOB_TYPE.START_EXTERNAL_RESERVATION,
      sessionId,
      SessionJobPayloadMapper.toReservationPayload(data),
      delayMs,
    );
  }

  async removeStartExternalReservationJob(sessionId: string): Promise<void> {
    await removeSessionJob(
      this.queue,
      SESSION_JOB_TYPE.START_EXTERNAL_RESERVATION,
      sessionId,
    );
  }
}
