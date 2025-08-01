import { Queue } from 'bull';

export type SessionJobType =
  | 'force-end-session'
  | 'force-end-alarm'
  | 'start-external-reservation'
  | 'discard-reservation-session';

export const SESSION_QUEUE_NAME = 'session' as const;

/** session 큐 job의 id 문자열을 만드는 헬퍼 (type별 일관된 id 규칙) */
export const sessionJobId = {
  forceEnd: (sessionId: string) => `${sessionId}-force-end`,
  forceEndAlarm: (sessionId: string) => `${sessionId}-force-end-alarm`,
  startExternalReservation: (sessionId: string) =>
    `${sessionId}-start-external-reservation`,
  discardReservation: (sessionId: string) => `${sessionId}-discard-reservation`,
} as const;

/** type + sessionId로 jobId 문자열 반환 (add/remove 공용) */
export function getSessionJobId(
  type: SessionJobType,
  sessionId: string,
): string {
  switch (type) {
    case 'force-end-session':
      return sessionJobId.forceEnd(sessionId);
    case 'force-end-alarm':
      return sessionJobId.forceEndAlarm(sessionId);
    case 'start-external-reservation':
      return sessionJobId.startExternalReservation(sessionId);
    case 'discard-reservation-session':
      return sessionJobId.discardReservation(sessionId);
  }
}

/** job type별 payload: force-end 계열은 예약/실시간 둘 다, 나머지는 예약만 */
export type SessionJobPayload<T extends SessionJobType> =
  T extends 'force-end-session'
    ? ReservationSessionJson | RealtimeSessionJson
    : T extends 'force-end-alarm'
      ? ReservationSessionJson | RealtimeSessionJson
      : T extends 'start-external-reservation'
        ? ReservationSessionJson
        : T extends 'discard-reservation-session'
          ? ReservationSessionJson
          : never;

export async function addSessionJob<T extends SessionJobType>(
  queue: Queue,
  type: T,
  sessionId: string,
  payload: SessionJobPayload<T>,
  delay: number,
): Promise<void> {
  const jobId = getSessionJobId(type, sessionId);
  await queue.add(type, payload, {
    delay,
    jobId,
    removeOnComplete: true,
    removeOnFail: 3,
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
