import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ReservationSession,
  ReservationSessionProps,
} from '../../domain/entities/reservation-session.entity';
import {
  RealtimeSession,
  RealtimeSessionProps,
} from '../../domain/entities/realtime-session.entity';
import { Mutex } from 'async-mutex';
import {
  ALARM_BEFORE_END_MS,
  BASIC_TIME_INTERVAL,
} from '../../domain/session.constant';
import type { SessionExtendContext } from '../../domain/runtime/session-domain.service';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { SessionEventPublisherPort } from '../ports/out/session-event-publisher.port';
import type { SessionUser } from '../../domain/value-objects/session-user.vo';
import {
  SESSION_JOB_PORT,
  SessionJobPort,
} from '../ports/out/session-job.port';
import {
  SessionSnapshotStorePort,
  SessionEntity,
} from '../ports/out/session-snapshot-store.port';
import { SessionDomainService } from '../../domain/runtime/session-domain.service';
import { ReservationStartWindowPolicy } from '../../domain/runtime/reservation-start-window.policy';
import type {
  SessionDiscardReservationNotification,
  SessionExternalReservationStartCommand,
  SessionNoShowDiscardNotification,
} from '../models/session-event-notifications';
import {
  SessionDiscardedReservationWritePort,
  type SessionDiscardedReservationWritePort as ISessionDiscardedReservationWritePort,
} from '../ports/out/session-discarded-reservation-write.port';
import { OnairSessionUseStateReadModelFactory } from '../../domain/value-objects/onair-session-use-state.read-model';
import type { OnairSessionUseStateReadModel } from '../../domain/value-objects/onair-session-use-state.read-model';
import {
  SessionRestoreAction,
  SessionRestorePolicy,
} from './session-restore.policy';
import type { SessionRuntimePort } from '../ports/out/session-runtime.port';
import { computeSessionUseStateBoundaryDelays } from './session-use-state-boundary.delays';
import { maskSessionListForLog } from '../logging/session-pii-log.util';

const SESSION_ATTENDANCE = {
  JOIN: '참가',
  ATTEND: '출석',
  LATE: '지각',
} as const;

function isReservationSession(
  session: RealtimeSession | ReservationSession,
): session is ReservationSession {
  return session instanceof ReservationSession;
}

@Injectable()
export class SessionRuntimeManager implements SessionRuntimePort {
  private readonly logger = new Logger(SessionRuntimeManager.name);

  constructor(
    @Inject(SessionSnapshotStorePort)
    private readonly snapshotStore: SessionSnapshotStorePort,
    @Inject(SESSION_JOB_PORT)
    private readonly sessionJobPort: SessionJobPort,
    private readonly sessionDomainService: SessionDomainService,
    @Inject(SessionEventPublisherPort)
    private readonly eventPublisher: SessionEventPublisherPort,
    @Inject(SessionDiscardedReservationWritePort)
    private readonly discardedReservationWrite: ISessionDiscardedReservationWritePort,
  ) {}

  private mutex = new Mutex();
  private currentSessionList: SessionEntity[] = [];

  async restoreOnBootstrap(): Promise<void> {
    const data = await this.snapshotStore.load();

    if (!data) return;

    const todayKst = AppKstDateTime.kstTodayYmd();

    const { date: cachedDate, list: cachedList } = data;
    if (!SessionRestorePolicy.isCacheDateValid(cachedDate, todayKst)) {
      this.logger.warn(
        `Skip Firestore restore: snapshot date "${cachedDate}" is not today KST "${todayKst}".`,
      );
      return;
    }

    const firebaseSessions = SessionRestorePolicy.filterSessionsForKstDay(
      cachedList,
      todayKst,
    );
    if (firebaseSessions.length === 0) {
      return;
    }

    this.applyFirebaseSnapshotOverDbBaseline(firebaseSessions);

    await Promise.allSettled(
      SessionRestorePolicy.actionsForBootstrap(this.currentSessionList).map(
        (action) => this.executeRestoreAction(action),
      ),
    );

    this.eventPublisher.publishSessionListChanged();
  }

  private async executeRestoreAction(
    action: SessionRestoreAction,
  ): Promise<void> {
    const sessionId = String(action.session.sessionId);

    switch (action.type) {
      case 'END_EXPIRED_ONAIR':
        if (action.session.status === 'ONAIR') {
          action.session.end();
        }
        await this.clearSessionEndTimedJobs(sessionId);
        return;
      case 'SCHEDULE_FORCE_END':
        await this.clearSessionEndTimedJobs(sessionId);
        await this.sessionJobPort.addForceEndJob(
          sessionId,
          action.session,
          action.delayMs,
        );
        if (action.alarmDelayMs != null) {
          await this.sessionJobPort.addForceEndAlarmJob(
            sessionId,
            action.session,
            action.alarmDelayMs,
          );
        }
        if (
          action.session.status === 'ONAIR' &&
          (action.session instanceof RealtimeSession ||
            action.session instanceof ReservationSession)
        ) {
          await this.scheduleSessionUseStateBoundaryJobs(action.session);
        }
        return;
      case 'SCHEDULE_EXTERNAL_START':
        await this.sessionJobPort.removeStartExternalReservationJob(sessionId);
        await this.sessionJobPort.addStartExternalReservationJob(
          sessionId,
          action.session,
          action.delayMs,
        );
        return;
      case 'SCHEDULE_NO_SHOW_DISCARD':
        await this.sessionJobPort.removeNoShowDiscardJob(sessionId);
        await this.sessionJobPort.addNoShowDiscardJob(
          sessionId,
          action.session,
          action.delayMs,
        );
        return;
      case 'SERVER_DOWN_DISCARD':
        await this.sessionJobPort.removeNoShowDiscardJob(sessionId);
        this.eventPublisher.publishServerDownDiscardReservation({
          reservationId: action.session.reservationId,
        });
        return;
      case 'IGNORE':
        return;
    }
  }

  async onSessionListChanged(): Promise<void> {
    await this.storeLatestSessionListToCache();
  }

  private async storeLatestSessionListToCache(): Promise<void> {
    this.logger.debug(
      'storeLatestSessionListToCache',
      maskSessionListForLog(this.currentSessionList),
    );
    await this.snapshotStore.save(this.currentSessionList);
  }

  getSessionListStatus(): SessionEntity[] {
    return [...this.currentSessionList];
  }

  getBeforeReservationSessions(): ReservationSession[] {
    return this.currentSessionList.filter(
      (s): s is ReservationSession =>
        s instanceof ReservationSession && s.status === 'BEFORE',
    );
  }

  getCurrentSessionStatus(): SessionEntity | null {
    return this.getCurrentSession() || null;
  }

  getSessionById(sessionId: string | number): SessionEntity | null {
    return (
      this.currentSessionList.find(
        (session) => String(session.sessionId) === String(sessionId),
      ) ?? null
    );
  }

  getNextReservationSession(): ReservationSession | null {
    const next = this.sessionDomainService.findNextSchedulableReservation(
      this.currentSessionList,
      this.getCurrentSessionStatus(),
      Date.now(),
    );
    return next ?? null;
  }

  private discardCompensationFor(reservation: ReservationSession): boolean {
    const onAir = this.currentSessionList.find((s) => s.status === 'ONAIR');
    return ReservationStartWindowPolicy.compensationApplies({
      currentOnAir: onAir ?? null,
      nextReservation: reservation,
    });
  }

  private getCurrentExtendContext(): SessionExtendContext | null {
    const cur = this.getCurrentSession();
    if (!cur) return null;
    const following = this.sessionDomainService.findFollowingBeforeReservation(
      this.currentSessionList,
      String(cur.sessionId),
    );
    return { currentSession: cur, followingReservation: following };
  }

  isExtendAtMaxCap(): boolean {
    const ctx = this.getCurrentExtendContext();
    if (!ctx) return false;
    return this.sessionDomainService.isExtendAtMaxCap(ctx);
  }

  getExtendMaxCapBlockedReason() {
    const ctx = this.getCurrentExtendContext();
    if (!ctx) return null;
    return this.sessionDomainService.getExtendMaxCapBlockedReason(ctx);
  }

  getOnairSessionUseStateReadModel(): OnairSessionUseStateReadModel {
    const now = new Date();
    const cur = this.getCurrentSessionStatus();
    const next = this.getNextReservationSession();
    const entity = this.getCurrentSession();
    const following =
      entity != null
        ? this.sessionDomainService.findFollowingBeforeReservation(
            this.currentSessionList,
            String(entity.sessionId),
          )
        : null;
    return OnairSessionUseStateReadModelFactory.build({
      now,
      currentSession: cur,
      nextReservationSession: next,
      followingBeforeReservation: following,
      domainService: this.sessionDomainService,
    });
  }

  private getCurrentSession(): RealtimeSession | ReservationSession | null {
    const onAirSession =
      this.currentSessionList.find((session) => session.status === 'ONAIR') ||
      null;
    return onAirSession || null;
  }

  getOnairAttendanceMemberIds(sessionId: string | number): number[] {
    const session = this.currentSessionList.find(
      (s) => String(s.sessionId) === String(sessionId) && s.status === 'ONAIR',
    );
    if (!session) {
      return [];
    }
    return session.attendanceList
      .filter((attendance) => attendance.status !== '결석')
      .map((attendance) => attendance.user.memberId);
  }

  private async scheduleForceEndAndAlarmJobs(
    session: RealtimeSession | ReservationSession,
    nowUtc: Date = new Date(),
  ): Promise<void> {
    const sessionId = String(session.sessionId);
    const term = AppKstDateTime.msUntilKstWallInstant(
      session.date,
      session.endTime,
      nowUtc.getTime(),
    );

    await this.sessionJobPort.addForceEndJob(sessionId, session, term);
    if (term > ALARM_BEFORE_END_MS) {
      await this.sessionJobPort.addForceEndAlarmJob(
        sessionId,
        session,
        term - ALARM_BEFORE_END_MS,
      );
    }
  }

  private async removeSessionUseStateBoundaryJobs(
    sessionId: string,
  ): Promise<void> {
    await this.sessionJobPort.removeSessionEndAvailableJob(sessionId);
    await this.sessionJobPort.removeSessionExtendUnavailableJob(sessionId);
  }

  async clearSessionEndTimedJobs(sessionId: string | number): Promise<void> {
    await this.sessionJobPort.removeAllSessionEndTimedJobs(sessionId);
  }

  private async scheduleSessionUseStateBoundaryJobs(
    session: RealtimeSession | ReservationSession,
    nowUtc: Date = new Date(),
  ): Promise<void> {
    const sessionId = String(session.sessionId);
    await this.removeSessionUseStateBoundaryJobs(sessionId);

    const { endAvailableDelayMs, extendUnavailableDelayMs } =
      computeSessionUseStateBoundaryDelays(session, nowUtc);

    if (endAvailableDelayMs != null) {
      await this.sessionJobPort.addSessionEndAvailableJob(
        sessionId,
        session,
        endAvailableDelayMs,
      );
    }
    if (extendUnavailableDelayMs != null) {
      await this.sessionJobPort.addSessionExtendUnavailableJob(
        sessionId,
        session,
        extendUnavailableDelayMs,
      );
    }
  }

  private async rescheduleSessionExtendUnavailableJob(
    session: RealtimeSession | ReservationSession,
    nowUtc: Date = new Date(),
  ): Promise<void> {
    const sessionId = String(session.sessionId);
    const { extendUnavailableDelayMs } = computeSessionUseStateBoundaryDelays(
      session,
      nowUtc,
    );
    await this.sessionJobPort.removeSessionExtendUnavailableJob(sessionId);
    if (extendUnavailableDelayMs != null) {
      await this.sessionJobPort.rescheduleSessionExtendUnavailableJob(
        sessionId,
        session,
        extendUnavailableDelayMs,
      );
    }
  }

  /** Firestore snapshot wins on conflict; DB reservations only fill gaps. */
  private applyFirebaseSnapshotOverDbBaseline(
    firebaseSessions: SessionEntity[],
  ): void {
    const dbBaseline = [...this.currentSessionList];
    this.currentSessionList = [...firebaseSessions];

    for (const dbSession of dbBaseline) {
      const alreadyCovered = this.currentSessionList.some((session) =>
        this.isSameSessionEntity(session, dbSession),
      );
      if (!alreadyCovered) {
        this.currentSessionList.push(dbSession);
      }
    }

    this.sortCurrentSessionList();
  }

  private isSameSessionEntity(a: SessionEntity, b: SessionEntity): boolean {
    if (String(a.sessionId) === String(b.sessionId)) {
      return true;
    }
    if (isReservationSession(a) && isReservationSession(b)) {
      return a.reservationId === b.reservationId;
    }
    return false;
  }

  private sortCurrentSessionList(): void {
    this.currentSessionList.sort((a, b) => {
      const aTime = AppKstDateTime.parseKstDateTime(a.date, a.startTime).getTime();
      const bTime = AppKstDateTime.parseKstDateTime(b.date, b.startTime).getTime();
      return aTime - bTime;
    });
  }

  private addSessionsAndSort(
    sessions: (RealtimeSession | ReservationSession)[],
  ): void {
    this.currentSessionList.push(...sessions);
    this.sortCurrentSessionList();
  }

  async startExternalReservationSession(
    payload: SessionExternalReservationStartCommand,
  ): Promise<void> {
    const release = await this.mutex.acquire();

    try {
      const target = this.currentSessionList.find(
        (s): s is ReservationSession =>
          s instanceof ReservationSession &&
          s.status === 'BEFORE' &&
          s.reservationType === 'EXTERNAL' &&
          String(s.sessionId) === String(payload.sessionId) &&
          s.reservationId === payload.reservationId,
      );
      if (!target) {
        throw new Error(
          `External reservation session not found (sessionId=${payload.sessionId}, reservationId=${payload.reservationId})`,
        );
      }

      const compensation = ReservationStartWindowPolicy.compensationApplies({
        currentOnAir: this.getCurrentSessionStatus(),
        nextReservation: target,
      });

      target.start({ slotAttendanceCompensation: compensation });

      const utcTime = new Date();
      await this.scheduleForceEndAndAlarmJobs(target, utcTime);
      await this.scheduleSessionUseStateBoundaryJobs(target, utcTime);

      this.eventPublisher.publishStartReservationSession();
      this.eventPublisher.publishSessionListChanged();
    } finally {
      release();
    }
  }

  async applyNoShowDiscardReservation(
    payload: SessionNoShowDiscardNotification,
  ): Promise<void> {
    this.onDiscardReservation(payload);
    const match = this.currentSessionList.find(
      (session) =>
        isReservationSession(session) &&
        session.reservationId === payload.reservationId &&
        String(session.sessionId) === String(payload.sessionId),
    );
    if (!match) {
      throw new Error(
        `No-show discard target not found (sessionId=${payload.sessionId}, reservationId=${payload.reservationId})`,
      );
    }
    await this.discardedReservationWrite.saveNoShowByReservationId(
      payload.reservationId,
      'NO_SHOW',
    );
  }

  onDiscardReservation(
    payload:
      | SessionNoShowDiscardNotification
      | SessionDiscardReservationNotification,
  ): void {
    const match = this.currentSessionList.find((session) => {
      if (!isReservationSession(session)) return false;
      if (session.reservationId !== payload.reservationId) return false;
      if (
        'sessionId' in payload &&
        payload.sessionId !== undefined &&
        String(session.sessionId) !== String(payload.sessionId)
      ) {
        return false;
      }
      return true;
    }) as ReservationSession | undefined;

    if (!match) return;

    match.discard();

    this.eventPublisher.publishSessionListChanged();
  }

  clearSessions(): void {
    this.currentSessionList = [];
  }

  async addReservationSessions(
    jsons: ReservationSessionProps[],
  ): Promise<void> {
    const release = await this.mutex.acquire();

    try {
      const newSessions = jsons.map((json) => ReservationSession.create(json));

      this.addSessionsAndSort(newSessions);

      this.eventPublisher.publishSessionListChanged();
    } finally {
      release();
    }
  }

  private async addRealTimeSession(session: RealtimeSession): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.addSessionsAndSort([session]);
      this.eventPublisher.publishSessionListChanged();
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

  async startReservationSession(starter: SessionUser): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      const next = this.sessionDomainService.findNextSchedulableReservation(
        this.currentSessionList,
        this.getCurrentSessionStatus(),
        Date.now(),
      );

      if (!(next instanceof ReservationSession)) {
        throw Error('ReservationSession which does not start is not exist');
      }

      const compensation = ReservationStartWindowPolicy.compensationApplies({
        currentOnAir: this.getCurrentSessionStatus(),
        nextReservation: next,
      });

      next.start({ slotAttendanceCompensation: compensation });

      await this.sessionJobPort.removeNoShowDiscardJob(next.sessionId);

      next.attend(starter, SESSION_ATTENDANCE.ATTEND);

      const utcTime = new Date();
      await this.scheduleForceEndAndAlarmJobs(next, utcTime);
      await this.scheduleSessionUseStateBoundaryJobs(next, utcTime);

      this.eventPublisher.publishStartReservationSession();
      this.eventPublisher.publishSessionListChanged();
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

      await this.sessionJobPort.addForceEndJob(
        newRealtimeSession.sessionId,
        newRealtimeSession,
        BASIC_TIME_INTERVAL,
      );
      await this.sessionJobPort.addForceEndAlarmJob(
        newRealtimeSession.sessionId,
        newRealtimeSession,
        BASIC_TIME_INTERVAL - ALARM_BEFORE_END_MS,
      );

      await this.scheduleSessionUseStateBoundaryJobs(newRealtimeSession);

      this.eventPublisher.publishStartRealtimeSession();
      this.eventPublisher.publishSessionListChanged();
    } finally {
      release();
    }
  }

  async attendToSession(
    user: SessionUser,
  ): Promise<
    | { status: '참가' | '출석' | '결석' }
    | { status: '지각'; lateMinutes: number }
    | null
  > {
    const currentSession = this.getCurrentSession();

    if (!currentSession) return null;

    const koreanTime = AppKstDateTime.getNowKoreanTime();

    this.eventPublisher.publishAttendSession();

    if (currentSession instanceof RealtimeSession) {
      currentSession.attend(user);

      this.eventPublisher.publishSessionListChanged();

      return { status: SESSION_ATTENDANCE.JOIN };
    }

    if (currentSession.participatorIds.some((id) => id == user.memberId)) {
      currentSession.attend(user, SESSION_ATTENDANCE.ATTEND);

      this.eventPublisher.publishSessionListChanged();

      return { status: SESSION_ATTENDANCE.ATTEND };
    }

    const isLate = this.sessionDomainService.isLateAttendance(
      currentSession,
      koreanTime,
      currentSession.slotAttendanceCompensationApplied,
    );
    if (!isLate) {
      currentSession.attend(user, SESSION_ATTENDANCE.ATTEND);

      this.eventPublisher.publishSessionListChanged();

      return { status: SESSION_ATTENDANCE.ATTEND };
    }

    currentSession.attend(user, SESSION_ATTENDANCE.LATE);

    this.eventPublisher.publishSessionListChanged();

    return {
      status: SESSION_ATTENDANCE.LATE,
      lateMinutes: this.sessionDomainService.getLateAttendanceMinutes(
        currentSession,
        koreanTime,
      ),
    };
  }

  async extendSession(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      const currentSession = this.getCurrentSession();
      if (!currentSession) return;

      const ctx = this.getCurrentExtendContext();
      if (!ctx) return;

      if (this.sessionDomainService.isExtendAtMaxCap(ctx)) {
        this.logger.warn(
          `extend skipped: already at extend cap (sessionId=${currentSession.sessionId})`,
        );
        return;
      }

      const newEndMs = this.sessionDomainService.resolveExtendEndMs(ctx);
      const newTerm = currentSession.extend(newEndMs);
      if (typeof newTerm !== 'number' || newTerm <= 0) {
        throw new Error(
          `Invalid term value returned from extend(): ${newTerm}`,
        );
      }

      await this.sessionJobPort.rescheduleForceEndJob(
        currentSession.sessionId,
        currentSession,
        newTerm,
      );
      await this.sessionJobPort.removeForceEndAlarmJob(
        currentSession.sessionId,
      );
      const alarmDelay = newTerm - ALARM_BEFORE_END_MS;
      if (alarmDelay > 0) {
        await this.sessionJobPort.addForceEndAlarmJob(
          currentSession.sessionId,
          currentSession,
          alarmDelay,
        );
      }

      await this.rescheduleSessionExtendUnavailableJob(currentSession);

      const utcTime = new Date();
      const startTimeMs = AppKstDateTime.parseKstDateTime(
        currentSession.date,
        currentSession.startTime,
      ).getTime();
      const endTimeMs = AppKstDateTime.parseKstDateTime(
        currentSession.date,
        currentSession.endTime,
      ).getTime();
      const remainingMsUntilEnd = Math.max(0, endTimeMs - utcTime.getTime());

      this.eventPublisher.publishExtendSession({
        sessionId: String(currentSession.sessionId),
        remainingMsUntilPreviousEnd: remainingMsUntilEnd,
        title: currentSession.title,
        startTimeMs,
        endTimeMs,
      });

      this.eventPublisher.publishSessionListChanged();
    } finally {
      release();
    }
  }

  async endSessionById(
    expectedSessionId: string,
  ): Promise<SessionEntity | void> {
    const release = await this.mutex.acquire();
    try {
      const session = this.getSessionById(expectedSessionId);
      if (!session || session.status !== 'ONAIR') {
        return;
      }

      if (
        !(
          session instanceof RealtimeSession ||
          session instanceof ReservationSession
        )
      ) {
        return;
      }

      session.end();
      await this.clearSessionEndTimedJobs(expectedSessionId);
      await this.eventPublisher.publishSessionListChangedAsync();

      return session;
    } finally {
      release();
    }
  }

  async forceEndSessionIfMatching(
    expectedSessionId: string | number,
  ): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      const currentSession = this.getCurrentSession();
      if (!currentSession) return false;

      if (String(currentSession.sessionId) !== String(expectedSessionId)) {
        return false;
      }

      currentSession.end();
      await this.clearSessionEndTimedJobs(expectedSessionId);
      this.eventPublisher.publishSessionListChanged();
      return true;
    } finally {
      release();
    }
  }
}
