import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
  ReservationSession,
  ReservationSessionProps,
} from './classes/reservation-session.class';
import {
  RealtimeSession,
  RealtimeSessionProps,
} from './classes/realtime-session.class';
import { Mutex } from 'async-mutex';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { CACHE_MANAGER, RedisCache } from 'src/redis/redis.constants';
import {
  ALARM_BEFORE_END_MS,
  ATTENDANCE_LATE_THRESHOLD_MS,
  BASIC_TIME_INTERVAL,
  KST_OFFSET_MS,
  RESERVATION_DISCARD_GRACE_MS,
} from './constant-variable';
import { getNowKoreanTime, parseKstDateTime } from 'src/reservation/reservation.utils';
import {
  addSessionJob,
  removeSessionJob,
  rescheduleSessionJob,
} from './session-job.utils';

function isReservationSessionJson(
  json: ReservationSessionProps | ReservationSessionJson,
): json is ReservationSessionJson {
  return json.sessionId != null;
}

/** 캐시에 저장하는 세션 리스트 payload (날짜 + 리스트) */
export type CachedSessionListPayload = {
  date: string;
  list: (ReservationSessionJson | RealtimeSessionJson)[];
};

@Injectable()
export class SessionManagerService implements OnApplicationBootstrap {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: RedisCache,
    @InjectQueue('session') private readonly sessionQueue: Queue,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private mutex = new Mutex();
  private currentSessionList: (RealtimeSession | ReservationSession)[] = [];

  async onApplicationBootstrap() {
    const data = await this.cacheManager.get<CachedSessionListPayload>(
      'latest-session-list',
    );

    if (!data) return;

    const nowKst = new Date(Date.now() + KST_OFFSET_MS);
    const todayKst = nowKst.toISOString().split('T')[0];

    if (data) {
      const { date: cachedDate, list: cachedList } = data;
      if (cachedDate !== todayKst) {
        await this.cacheManager.del('latest-session-list');
        return;
      }
      if (cachedList.length === 0) return;
    }

    const latestSessionListJsons: (
      | ReservationSessionJson
      | RealtimeSessionJson
    )[] = data.list;

    const reservedJsons = latestSessionListJsons.filter(
      (j): j is ReservationSessionJson => j.sessionType === 'RESERVED',
    );
    const realtimeJsons = latestSessionListJsons.filter(
      (j): j is RealtimeSessionJson => j.sessionType !== 'RESERVED',
    );

    if (reservedJsons.length > 0) {
      await this.addReservationSessions(reservedJsons);
    }
    for (const json of realtimeJsons) {
      this.addRealTimeSession(RealtimeSession.restore(json));
    }

    // ONAIR: force-end job 없으면 재등록 / BEFORE(예약): start·discard job 다시 연산해 재등록
    await Promise.allSettled(
      latestSessionListJsons.map(async (json): Promise<void> => {
        const sessionId = String(json.sessionId);

        if (json.status === 'ONAIR') {
          const utcTime = new Date();
          const nowTime = new Date(utcTime.getTime() + KST_OFFSET_MS);
          const endTimeKst = parseKstDateTime(
            typeof json.date === 'string'
              ? json.date
              : nowTime.toISOString().split('T')[0],
            json.endTime,
          );

          // 종료 시각이 이미 지났으면 AFTER로 바꾸고 force-end job 제거
          if (nowTime.getTime() >= endTimeKst.getTime()) {
            const session = this.currentSessionList.find(
              (s) => String(s.sessionId) === sessionId,
            );
            if (session?.status === 'ONAIR') {
              session.end();
            }
            await removeSessionJob(
              this.sessionQueue,
              'force-end-session',
              sessionId,
            );
            await removeSessionJob(
              this.sessionQueue,
              'force-end-alarm',
              sessionId,
            );
            return;
          }

          const foundJob = await this.sessionQueue.getJob(
            json.sessionId as string,
          );
          if (!foundJob) {
            const term = endTimeKst.getTime() - nowTime.getTime();
            await addSessionJob(
              this.sessionQueue,
              'force-end-session',
              sessionId,
              json,
              term,
            );
            if (term > ALARM_BEFORE_END_MS) {
              await addSessionJob(
                this.sessionQueue,
                'force-end-alarm',
                sessionId,
                json,
                term - ALARM_BEFORE_END_MS,
              );
            }
          }
          return;
        }

        if (json.status === 'BEFORE' && json.sessionType === 'RESERVED') {
          const res = json;
          if (res.reservationType === 'EXTERNAL') {
            const utcTime = new Date();
            const nowTime = new Date(utcTime.getTime() + KST_OFFSET_MS);
            const StartTime = new Date(
              nowTime.toISOString().split('T')[0] + 'T' + res.startTime + 'Z',
            );
            const delay = StartTime.getTime() - utcTime.getTime();
            await removeSessionJob(
              this.sessionQueue,
              'start-external-reservation',
              sessionId,
            );
            if (delay > 0) {
              await addSessionJob(
                this.sessionQueue,
                'start-external-reservation',
                sessionId,
                res,
                delay,
              );
            }
          } else {
            const startTimeKst = parseKstDateTime(res.date, res.startTime);
            const nowUtcMs = Date.now();
            const delay =
              startTimeKst.getTime() - nowUtcMs + RESERVATION_DISCARD_GRACE_MS;

            await removeSessionJob(
              this.sessionQueue,
              'discard-reservation-session',
              sessionId,
            );
            if (delay > 0) {
              await addSessionJob(
                this.sessionQueue,
                'discard-reservation-session',
                sessionId,
                res,
                delay,
              );
            } else {
              // 시작 시각 + grace 이미 지남 → 미시작 예약이므로 DISCARDED 처리
              this.currentSessionList
                .find(
                  (s): s is ReservationSession =>
                    String(s.sessionId) === sessionId &&
                    s instanceof ReservationSession,
                )
                ?.discard();
            }
          }
        }
      }),
    );

    this.eventEmitter.emit('session-list-changed');
  }

  @OnEvent('session-list-changed')
  async storeLatestSessionListToCache() {
    const nowKst = new Date(Date.now() + KST_OFFSET_MS);
    const todayKst = nowKst.toISOString().split('T')[0];
    const payload: CachedSessionListPayload = {
      date: todayKst,
      list: this.currentSessionList.map((s) => s.toJSON()),
    };
    await this.cacheManager.set(
      'latest-session-list',
      JSON.stringify(payload),
    );
  }

  /**
   * @returns currentSessionList
   * @type object[]
   */
  getSessionListStatus(): (RealtimeSessionJson | ReservationSessionJson)[] {
    return this.currentSessionList.map((session) => session.toJSON());
  }

  /**
   * @returns currentSessionList
   * @type object
   */
  getCurrentSessionStatus():
    | RealtimeSessionJson
    | ReservationSessionJson
    | null {
    const currentSession = this.getCurrentSession() || null;
    if (!currentSession) return null;
    return currentSession.toJSON();
  }

  /**
   * @returns currentSessionList
   * @type object
   */
  getNextReservationSession(): ReservationSessionJson | null {
    const nextReservationSession = this.currentSessionList.find(
      (s) => s.status === 'BEFORE' && s instanceof ReservationSession,
    );
    if (!nextReservationSession)
      return null;

    const session = this.currentSessionList.find(
      (s) =>
        s.sessionId === nextReservationSession.sessionId &&
        s instanceof ReservationSession,
    );
    if (!(session instanceof ReservationSession))
      return null;

    return session.toJSON();
  }

  private getCurrentSession(): RealtimeSession | ReservationSession | null {
    const onAirSession =
      this.currentSessionList.find((session) => session.status === 'ONAIR') ||
      null;
    return onAirSession || null;
  }

  /** 세션 추가 후 startTime 기준 시간순 정렬 */
  private addSessionsAndSort(
    sessions: (RealtimeSession | ReservationSession)[],
  ): void {
    this.currentSessionList.push(...sessions);
    this.currentSessionList.sort((a, b) => {
      const aTime = parseKstDateTime(a.date, a.startTime).getTime();
      const bTime = parseKstDateTime(b.date, b.startTime).getTime();
      return aTime - bTime;
    });
  }

  @OnEvent('start-external-reservation')
  private async startExternalReservationSession(): Promise<void> {
    const release = await this.mutex.acquire();

    try {
      const reservaitonSession = this.currentSessionList.find(
        (s) => s.status === 'BEFORE' && s instanceof ReservationSession,
      );
      if (!!reservaitonSession) {
        (reservaitonSession as ReservationSession).start();

        const utcTime = new Date();
        const nowTime = new Date(utcTime.getTime() + KST_OFFSET_MS);
        const EndTime = new Date(
          nowTime.toISOString().split('T')[0] +
            'T' +
            reservaitonSession.endTime +
            'Z',
        );

        const term = EndTime.getTime() - nowTime.getTime();

        await addSessionJob(
          this.sessionQueue,
          'force-end-session',
          reservaitonSession.sessionId,
          reservaitonSession.toJSON(),
          term,
        );

        this.eventEmitter.emit('start-reservation-session');

        this.eventEmitter.emit('session-list-changed');
      } else {
        // 오류임
        throw Error('ReservationSession which does not start is not exist');
      }
    } finally {
      release();
    }
  }

  @OnEvent('start-reservation-session')
  private reloadNextReservationSessionId(): void {
    const utcNow = new Date();
    const nowKst = new Date(utcNow.getTime() + KST_OFFSET_MS);

    const candidates = this.currentSessionList.filter((session) => {
      if (
        session.status !== 'BEFORE' ||
        !(session instanceof ReservationSession)
      )
        return false;
      const startTime = parseKstDateTime(session.date, session.startTime);
      const isStale =
        startTime.getTime() + RESERVATION_DISCARD_GRACE_MS < nowKst.getTime();
      return !isStale;
    });

    // currentSessionList는 이미 시간순으로 정렬되어 있으므로, 첫 BEFORE & non-stale 세션이 next
    const nextReservationSession = candidates[0] as
      | ReservationSession
      | undefined;

  }

  @OnEvent('discard-reservation-session')
  private onDiscardReservationSession() {
    const nextReservationSession = this.currentSessionList.find(
      (session) =>
        session.status === 'BEFORE' && session instanceof ReservationSession,
    );

    if (!!nextReservationSession) {
      (nextReservationSession as ReservationSession).discard();
    }

    this.eventEmitter.emit('session-list-changed');

    this.reloadNextReservationSessionId();
  }

  clearSessions(): void {
    this.currentSessionList = [];
  }

  /**
   * 자정 세션리스트 초기화 시 사용
   *
   */
  async addReservationSessions(
    jsons: (ReservationSessionProps | ReservationSessionJson)[],
  ) {
    const release = await this.mutex.acquire();

    try {
      const newSessions = jsons.map((json) =>
        isReservationSessionJson(json)
          ? ReservationSession.restore(json)
          : ReservationSession.create(json),
      );

      this.addSessionsAndSort(newSessions);

      await Promise.all(
        newSessions.map(async (session) => {
          if (session.reservationType === 'EXTERNAL') {
            if (session.status !== 'BEFORE') return;

            const utcTime = new Date();
            const nowTime = new Date(utcTime.getTime() + KST_OFFSET_MS);
            const StartTime = new Date(
              nowTime.toISOString().split('T')[0] +
                'T' +
                session.startTime +
                'Z',
            );

            const delay = StartTime.getTime() - nowTime.getTime();

            await removeSessionJob(
              this.sessionQueue,
              'start-external-reservation',
              session.sessionId,
            );
            if (delay > 0)
              await addSessionJob(
                this.sessionQueue,
                'start-external-reservation',
                session.sessionId,
                session.toJSON(),
                delay,
              );
          } else {
            // KST 기준 시작 시각 + grace 시간에 폐기 (시작 시각이 지나고 grace가 지나면 미시작 예약을 discard)
            const startTimeKst = parseKstDateTime(
              session.date,
              session.startTime,
            );
            const nowUtcMs = Date.now();
            const delay =
              startTimeKst.getTime() - nowUtcMs + RESERVATION_DISCARD_GRACE_MS;

            await removeSessionJob(
              this.sessionQueue,
              'discard-reservation-session',
              session.sessionId,
            );

            if (delay > 0)
              await addSessionJob(
                this.sessionQueue,
                'discard-reservation-session',
                session.sessionId,
                session.toJSON(),
                delay,
              );
          }
        }),
      );

      this.reloadNextReservationSessionId();
      this.eventEmitter.emit('session-list-changed');
    } finally {
      release();
    }
  }

  private async addRealTimeSession(session: RealtimeSession): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.addSessionsAndSort([session]);

      this.eventEmitter.emit('session-list-changed');
    } finally {
      release();
    }
  }

  isAlreadyAttendUser(userId: number): boolean {
    const currentSession = this.getCurrentSession();

    if (!currentSession) return false;

    return currentSession.attendanceList.some(
      (attendInfo) => attendInfo.user.memberId == userId,
    );
  }

  async startReservationSession(starter: User): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      const reservaitonSession = this.currentSessionList.find(
        (s) => s.status === 'BEFORE' && s instanceof ReservationSession,
      );

      if (
        !!reservaitonSession &&
        reservaitonSession instanceof ReservationSession
      ) {
        reservaitonSession.start();

        // 이 예약은 실제로 시작되었으므로, 예정돼 있던 discard-reservation-session job은 제거
        await removeSessionJob(
          this.sessionQueue,
          'discard-reservation-session',
          reservaitonSession.sessionId,
        );

        reservaitonSession.attend(starter, '출석');

        const utcTime = new Date();
        const nowTime = new Date(utcTime.getTime() + KST_OFFSET_MS);
        const dateStr = nowTime.toISOString().split('T')[0];
        const EndTime = parseKstDateTime(dateStr, reservaitonSession.endTime);

        const term = EndTime.getTime() - utcTime.getTime();

        await addSessionJob(
          this.sessionQueue,
          'force-end-session',
          reservaitonSession.sessionId,
          reservaitonSession.toJSON(),
          term,
        );
        await addSessionJob(
          this.sessionQueue,
          'force-end-alarm',
          reservaitonSession.sessionId,
          reservaitonSession.toJSON(),
          term - ALARM_BEFORE_END_MS,
        );

        this.eventEmitter.emit('start-reservation-session');

        this.eventEmitter.emit('session-list-changed');
      } else {
        // 오류임
        throw Error('ReservationSession which does not start is not exist');
      }
    } finally {
      release();
    }
  }

  async startRealTimeSession(
    realtimeSessionProps: RealtimeSessionProps,
  ): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      const newRealtimeSession = RealtimeSession.create(realtimeSessionProps);

      this.addSessionsAndSort([newRealtimeSession]);

      await addSessionJob(
        this.sessionQueue,
        'force-end-session',
        newRealtimeSession.sessionId,
        newRealtimeSession.toJSON(),
        BASIC_TIME_INTERVAL,
      );
      await addSessionJob(
        this.sessionQueue,
        'force-end-alarm',
        newRealtimeSession.sessionId,
        newRealtimeSession.toJSON(),
        BASIC_TIME_INTERVAL - ALARM_BEFORE_END_MS,
      );

      this.eventEmitter.emit('start-realtime-session');

      this.eventEmitter.emit('session-list-changed');
    } finally {
      release();
    }
  }

  async attendToSession(
    user: User,
  ): Promise<'출석' | '결석' | '지각' | '참가' | null> {
    const currentSession = this.getCurrentSession();

    if (!currentSession) return null;

    const koreanTime = getNowKoreanTime();

    this.eventEmitter.emit('attend-session');

    if (currentSession instanceof RealtimeSession) {
      currentSession.attend(user);

      this.eventEmitter.emit('session-list-changed');

      return '참가';
    } else {
      if (currentSession.participatorIds.some((id) => id == user.memberId)) {
        currentSession.attend(user, '출석');

        this.eventEmitter.emit('session-list-changed');

        return '출석';
      }
      const startTime = parseKstDateTime(
        koreanTime.toISOString().split('T')[0],
        currentSession.startTime,
      );
      const timeDiff = koreanTime.getTime() - startTime.getTime();
      if (timeDiff <= ATTENDANCE_LATE_THRESHOLD_MS) {
        currentSession.attend(user, '출석');

        this.eventEmitter.emit('session-list-changed');

        return '출석';
      } else {
        currentSession.attend(user, '지각');

        this.eventEmitter.emit('session-list-changed');

        return '지각';
      }
    }
  }

  async extendSession(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      const currentSession = this.getCurrentSession();
      if (!currentSession)
        return;

      const newTerm = currentSession.extend();
      if (typeof newTerm !== 'number' || newTerm <= 0) {
        throw new Error(
          `Invalid term value returned from extend(): ${newTerm}`,
        );
      }

      await rescheduleSessionJob(
        this.sessionQueue,
        'force-end-session',
        currentSession.sessionId,
        currentSession.toJSON(),
        newTerm,
      );
      await rescheduleSessionJob(
        this.sessionQueue,
        'force-end-alarm',
        currentSession.sessionId,
        currentSession.toJSON(),
        newTerm - ALARM_BEFORE_END_MS,
      );

      this.eventEmitter.emit('extend-session');

      this.eventEmitter.emit('session-list-changed');
    } finally {
      release();
    }
  }

  async endSession(): Promise<ReservationSessionJson | RealtimeSessionJson | void> {
    const release = await this.mutex.acquire();
    try {
      const currentSession = this.getCurrentSession();
      if (!currentSession)
        return;

      currentSession.end();

      await removeSessionJob(
        this.sessionQueue,
        'force-end-session',
        currentSession.sessionId,
      );
      await removeSessionJob(
        this.sessionQueue,
        'force-end-alarm',
        currentSession.sessionId,
      );

      this.eventEmitter.emit('end-session');

      this.eventEmitter.emit('session-list-changed');

      return currentSession.toJSON();
    } finally {
      release();
    }
  }

  async forceEndSession(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      const currentSession = this.getCurrentSession();
      if (!currentSession)
        return;

      currentSession.end();
      await removeSessionJob(
        this.sessionQueue,
        'force-end-session',
        currentSession.sessionId,
      );
      await removeSessionJob(
        this.sessionQueue,
        'force-end-alarm',
        currentSession.sessionId,
      );
      this.eventEmitter.emit('session-list-changed');
    } finally {
      release();
    }
  }
}
