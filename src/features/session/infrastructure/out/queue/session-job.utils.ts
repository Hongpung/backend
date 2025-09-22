import { Queue } from 'bullmq';
import {
  getSessionJobId,
  SessionJobPayload,
  SessionJobType,
} from './session-job.interface';

export type {
  SessionJobPayload,
  SessionJobType,
} from './session-job.interface';
export {
  getSessionJobId,
  SESSION_JOB_TYPE,
  SESSION_QUEUE_NAME,
  sessionJobId,
} from './session-job.interface';

export async function addSessionJob<T extends SessionJobType>(
  queue: Queue,
  type: T,
  sessionId: string,
  payload: SessionJobPayload<T>,
  delay: number,
  options?: { attempts?: number; backoffMs?: number },
): Promise<void> {
  const jobId = getSessionJobId(type, sessionId);
  await queue.add(type, payload, {
    delay,
    jobId,
    removeOnComplete: true,
    removeOnFail: 3,
    ...(options?.attempts != null
      ? {
          attempts: options.attempts,
          backoff: { type: 'fixed' as const, delay: options.backoffMs ?? 1000 },
        }
      : {}),
  });
}

/**
 * session 큐에서 해당 type + sessionId의 job이 있으면 제거합니다.
 * 이미 완료/삭제된 job이면 에러 없이 무시합니다.
 */
export async function removeSessionJob(
  queue: Queue,
  type: SessionJobType,
  sessionId: string,
): Promise<void> {
  const jobId = getSessionJobId(type, sessionId);
  const job = await queue.getJob(jobId);
  if (!job) return;
  try {
    await job.remove();
  } catch {
    // 이미 완료/삭제된 경우(race condition) 무시
  }
}

/**
 * delay만 바꿔서 다시 등록합니다. 기존 job은 삭제한 뒤 같은 type/sessionId/payload로 새 delay로 추가합니다.
 */
export async function rescheduleSessionJob<T extends SessionJobType>(
  queue: Queue,
  type: T,
  sessionId: string,
  payload: SessionJobPayload<T>,
  newDelay: number,
): Promise<void> {
  await removeSessionJob(queue, type, sessionId);
  await addSessionJob(queue, type, sessionId, payload, newDelay);
}
