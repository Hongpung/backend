import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ReservationSession, ReservationSessionProps } from './classes/reservation-session.class';
import { RealtimeSession, RealtimeSessionProps } from './classes/realtime-session.class';
import { Mutex } from 'async-mutex';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager'
import { BASIC_TIME_INTERVAL } from './constant-variable';

@Injectable()
export class SessionManagerService implements OnModuleInit {

  constructor(

    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue('session') private readonly sessionQueue: Queue,
    private readonly eventEmitter: EventEmitter2
  ) { }

  private mutex = new Mutex();
  private currentSessionList: (RealtimeSession | ReservationSession)[] = [];
  private nextReservationSessionId: string | null = null;

  async onModuleInit() {
    const latestSessionList = await this.cacheManager.get<string>('latest-session-list');

    if (!!latestSessionList) {
      console.log('Find! Latest Session List')
      const latestSessionListJsons = JSON.parse(latestSessionList) as (ReservationSessionJson | RealtimeSessionJson)[]
      console.log(latestSessionListJsons)
      Promise.allSettled(latestSessionListJsons.map(async (json): Promise<void> => {
        if (json.sessionType == 'RESERVED') {
          const reservationProps = {
            ...json
          } as ReservationSessionProps
          this.addReservationSessions([reservationProps])
        } else {
          const reservationProps = {
            ...json
          } as RealtimeSessionProps
          this.addRealTimeSession(reservationProps)
        }

        if (json.status == 'ONAIR') {
          const foundJob = await this.sessionQueue.getJob(json.sessionId);
          if (!!foundJob) {
            console.log('found Job!')
          }
          else {
            const utcTime = new Date();
            const nowTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000);
            const EndTime = new Date(nowTime.toISOString().split('T')[0] + 'T' + json.endTime + 'Z');

            const term = EndTime.getTime() - nowTime.getTime()

            this.sessionQueue.add(`force-end-session`, json, { delay: term, jobId: json.sessionId, removeOnComplete: true, removeOnFail: true });
          }
        }
      }))

      this.eventEmitter.emit('restore-session-list')

    }

    else console.log('LatestSessionList is not exist!')

  }

  @OnEvent('session-list-changed')
  async storeLatestSessionListToCache() {
    const sessionListJson = JSON.stringify(this.currentSessionList);
    console.log(sessionListJson)
    await this.cacheManager.set('latest-session-list', sessionListJson);
    console.log('Update lastest session list is Done!');
  }

  /**
   * @returns currentSessionList
   * @type object[]
   */
  getSessionListStatus(): (RealtimeSessionJson | ReservationSessionJson)[] {
    return this.currentSessionList.map(session => session.toJSON());
  }

  /**
   * @returns currentSessionList
   * @type object
   */
  getCurrentSessionStatus(): (RealtimeSessionJson | ReservationSessionJson | null) {
    const currentSession = this.getCurrentSession() || null;
    if (!currentSession) return null;
    return currentSession.toJSON();
  }

  /**
   * @returns currentSessionList
   * @type object
   */
  getNextReservationSession(): ReservationSessionJson | null {
    if (!this.nextReservationSessionId) return null;
    return this.currentSessionList.find(s => (s.sessionId === this.nextReservationSessionId && s instanceof ReservationSession))?.toJSON() as ReservationSessionJson || null;
  }


  private getCurrentSession(): RealtimeSession | ReservationSession | null {
    const onAirSession = this.currentSessionList.find(session => session.status === 'ONAIR') || null;
    return onAirSession || null;
  }


  private getRealtimeSessionInsertAt(): number {
    // 다음 예약 세션이 없다면 세션리스트의 마지막에 저장
    // 아래 행도 동일한 역할을 하지만 성능능 개선을 위해
    if (!this.nextReservationSessionId) return -1;

    // 다음 예약 세션이 존재한다면 다음 예약 세션의 앞에 저장
    const nextReservationSessionIndex = this.currentSessionList.findIndex(s => s.sessionId == this.nextReservationSessionId)
    return nextReservationSessionIndex;
  }


  @OnEvent('start-external-reservation')
  private async startExternalReservationSession(): Promise<void> {
    const release = await this.mutex.acquire();

    try {

      const reservaitonSession = this.currentSessionList.find(s => s.sessionId == this.nextReservationSessionId);

      if (!!reservaitonSession && reservaitonSession instanceof ReservationSession) {
        reservaitonSession.start();

        const utcTime = new Date();
        const nowTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000);
        const EndTime = new Date(nowTime.toISOString().split('T')[0] + 'T' + reservaitonSession.endTime + 'Z');

        const term = EndTime.getTime() - nowTime.getTime()

        console.log('external-reservations started and end Term is : ', nowTime, EndTime, term / 1000)
        await this.sessionQueue.add(`force-end-session`, reservaitonSession.toJSON(), { delay: term, jobId: reservaitonSession.sessionId });

        this.eventEmitter.emit('start-reservation-session')

        this.eventEmitter.emit('session-list-changed')
      }
      else {
        // 오류임
        throw Error('ReservationSession which does not start is not exist')
      }
    } finally {

      release();

    }
  }


  @OnEvent('start-reservation-session')
  private reloadNextReservationSessionId(): void {
    // 다음 예약 세션이 없다면 세션리스트의 마지막에 저장
    // 아래 행도 동일한 역할을 하지만 성능 개선을 위해
    const nextReservationSession = this.currentSessionList.find(session => session.status == 'BEFORE' && session instanceof ReservationSession);

    this.nextReservationSessionId = nextReservationSession?.sessionId ?? null;

  }

  @OnEvent('discard-reservation-session')
  private onDiscardReservationSession() {

    const nextReservationSession: ReservationSession = (this.currentSessionList.find(session => session.sessionId === this.nextReservationSessionId)) as ReservationSession | null

    if (!!nextReservationSession) {
      nextReservationSession.discard()
    }

    this.eventEmitter.emit('session-list-changed')
    
    this.reloadNextReservationSessionId()

  }

  clearSessions(): void {
    this.currentSessionList = [];

  }


  /**
   * 자정 세션리스트 초기화 시 사용
   * 
  */
  async addReservationSessions(jsons: ReservationSessionProps[]) {

    const release = await this.mutex.acquire();

    try {

      const newSessions = jsons.map(json => ReservationSession.parse(json))

      this.nextReservationSessionId = newSessions[0]?.sessionId || null;

      this.currentSessionList.push(...newSessions);

      Promise.all(newSessions.map(async (session) => {

        if (session.reservationType === 'EXTERNAL') {

          if (session.status !== 'BEFORE') return;

          const utcTime = new Date();
          const nowTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000);
          const StartTime = new Date(nowTime.toISOString().split('T')[0] + 'T' + session.startTime + 'Z');

          const delay = StartTime.getTime() - nowTime.getTime()

          console.log(nowTime, session.startTime, nowTime.toISOString().split('T')[0] + 'T' + session.startTime + 'Z')
          console.log('External Reservation start Schedular' + delay)

          const prevRegisteredJob = await this.sessionQueue.getJob(`${session.sessionId}`+`start`)
          if (prevRegisteredJob) prevRegisteredJob.remove();
          if (delay > 0)
            this.sessionQueue.add('start-external-reservation', session.toJSON(), { delay, jobId: `${session.sessionId}`+`start`, removeOnComplete: true, removeOnFail: 3 });
        } else {

          const startTime = new Date(`${session.date}T${session.startTime}`);
          const delay = (startTime.getTime() - new Date().getTime()) + 10 * 60 * 1000; // 10분안에 미실행 시 폐기

          const prevRegisteredJob = await this.sessionQueue.getJob(`${session.sessionId}` + 'discard')
          if (prevRegisteredJob) prevRegisteredJob.remove();

          if (delay > 0)
            await this.sessionQueue.add(`discard-reservation-session`, session.toJSON(), { delay, jobId: session.sessionId + 'discard' });
          console.log('세션 강제 종료 큐 추가됨')

        }
      }))

      this.reloadNextReservationSessionId();

    } finally {

      release();

    }

  }

  private async addRealTimeSession(realtimeSessionProps: RealtimeSessionProps): Promise<void> {
    const release = await this.mutex.acquire();
    try {

      const newRealtimeSession = RealtimeSession.parse(realtimeSessionProps)

      this.currentSessionList.push(newRealtimeSession)

    } finally {

      release();

    }
  }

  isAlreadyAttendUser(userId: number): boolean {
    const currentSession = this.getCurrentSession();

    if (!currentSession) return false;

    return currentSession.attendanceList.some((attendInfo) => attendInfo.user.memberId == userId)
  }

  async startReservationSession(starter: User): Promise<void> {

    const release = await this.mutex.acquire();
    try {

      const reservaitonSession = this.currentSessionList.find(s => s.sessionId == this.nextReservationSessionId);

      if (!!reservaitonSession && reservaitonSession instanceof ReservationSession) {
        reservaitonSession.start();

        reservaitonSession.attend(starter, "출석")

        const utcTime = new Date();
        const nowTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000);
        const EndTime = new Date(nowTime.toISOString().split('T')[0] + 'T' + reservaitonSession.endTime + 'Z');

        const term = EndTime.getTime() - nowTime.getTime()

        await this.sessionQueue.add(`force-end-session`, reservaitonSession.toJSON(), { delay: term, jobId: reservaitonSession.sessionId, removeOnComplete: true, removeOnFail: 3 });
        await this.sessionQueue.add(`force-end-alarm`, reservaitonSession.toJSON(), { delay: term - 10 * 60 * 1000, jobId: reservaitonSession.sessionId + 'alarm', removeOnComplete: true, removeOnFail: 3 });

        this.eventEmitter.emit('start-reservation-session')

        this.eventEmitter.emit('session-list-changed')
      }
      else {
        // 오류임
        throw Error('ReservationSession which does not start is not exist')
      }
    } finally {

      release();

    }

  }

  async startRealTimeSession(realtimeSessionProps: RealtimeSessionProps): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      const insertIndex = this.getRealtimeSessionInsertAt()
      const newRealtimeSession = RealtimeSession.parse(realtimeSessionProps)

      if (insertIndex == -1) this.currentSessionList.push(newRealtimeSession)

      else
        this.currentSessionList.splice(insertIndex, 0, newRealtimeSession)

      await this.sessionQueue.add(`force-end-session`, newRealtimeSession.toJSON(), { delay: BASIC_TIME_INTERVAL, jobId: newRealtimeSession.sessionId, removeOnComplete: true, removeOnFail: 3 });
      await this.sessionQueue.add(`force-end-alarm`, newRealtimeSession.toJSON(), { delay: BASIC_TIME_INTERVAL - 10 * 60 * 1000, jobId: newRealtimeSession.sessionId + 'alarm', removeOnComplete: true, removeOnFail: 3 });

      this.eventEmitter.emit('start-realtime-session')

      this.eventEmitter.emit('session-list-changed')
    } finally {

      release();

    }
  }


  async attendToSession(user: User): Promise<'출석' | '결석' | '지각' | '참가' | null> {

    const currentSession = this.getCurrentSession();

    if (!currentSession) return null;

    const utcTime = new Date();

    const koreanTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000);

    this.eventEmitter.emit('attend-session')

    if (currentSession instanceof RealtimeSession) {

      currentSession.attend(user)

      this.eventEmitter.emit('session-list-changed')

      return '참가';
    } else {

      if (currentSession.participatorIds.some(id => id == user.memberId)) {
        currentSession.attend(user, '출석')

        this.eventEmitter.emit('session-list-changed')

        return '출석'
      }
      const startTime = new Date(koreanTime.toISOString().split('T')[0] + 'T' + currentSession.startTime + ':00.000Z');
      // 현재 시간과 시작 시간의 차이를 계산 (밀리초 단위)
      const timeDiff = koreanTime.getTime() - startTime.getTime();
      // 분기 처리: 시작 10분 전부터 시작 후 5분까지는 출석, 그 이후는 지각

      if (timeDiff <= 5 * 60 * 1000) {
        // 시작 10분 전 (-10 * 60 * 1000)에서 시작 후 5분 (5 * 60 * 1000)까지
        currentSession.attend(user, '출석')

        this.eventEmitter.emit('session-list-changed')

        return '출석'
      } else {
        // 시작 후 5분이 지난 경우
        currentSession.attend(user, '지각')


        this.eventEmitter.emit('session-list-changed')

        return '지각'
      }
    }

  }

  async extendSession(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      const currentSession = this.getCurrentSession();
      if (!currentSession) {
        console.warn("No current session found to extend.");
        return;
      }

      const newTerm = currentSession.extend();
      if (typeof newTerm !== 'number' || newTerm <= 0) {
        throw new Error(`Invalid term value returned from extend(): ${newTerm}`);
      }

      const beforeJob = await this.sessionQueue.getJob(currentSession.sessionId);
      const beforeAlarm = await this.sessionQueue.getJob(currentSession.sessionId + 'alarm');

      if (beforeJob) {
        await beforeJob.remove(); // discard should be awaited for safety
      }

      if (beforeAlarm) {
        await beforeAlarm.remove()
      }

      await this.sessionQueue.add(`force-end-session`, currentSession.toJSON(), { delay: newTerm, jobId: currentSession.sessionId, removeOnComplete: true, removeOnFail: 3 });
      await this.sessionQueue.add(`force-end-alarm`, currentSession.toJSON(), { delay: newTerm - 10 * 60 * 1000, jobId: currentSession.sessionId + 'alarm', removeOnComplete: true, removeOnFail: 3 });

      this.eventEmitter.emit('extend-session')

      this.eventEmitter.emit('session-list-changed')

    } finally {
      release();
    }
  }


  async endSession(): Promise<ReservationSessionJson | RealtimeSessionJson> {
    const release = await this.mutex.acquire();
    try {
      const currentSession = this.getCurrentSession();
      if (!currentSession) {
        console.warn("No current session found to extend.");
        return;
      }

      currentSession.end();

      const beforeJob = await this.sessionQueue.getJob(currentSession.sessionId);

      const beforeAlarm = await this.sessionQueue.getJob(currentSession.sessionId + 'alarm');

      if (beforeJob) {
        await beforeJob.remove(); // discard should be awaited for safety
      }

      if (beforeAlarm) {
        await beforeAlarm.remove()
      }

      this.eventEmitter.emit('end-session')

      this.eventEmitter.emit('session-list-changed')

      return currentSession.toJSON();

    } finally {
      release();
    }

  }


  async forceEndSession(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      const currentSession = this.getCurrentSession();
      if (!currentSession) {
        console.warn("No current session found to extend.");
        return;
      }

      currentSession.end();
      console.log('force-end Complete');

      this.eventEmitter.emit('session-list-changed')

    } finally {
      release();
    }

  }


}
