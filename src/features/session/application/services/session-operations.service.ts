import { Injectable, Inject, Logger } from '@nestjs/common';
import type { EndSessionResultVo } from 'src/features/session/domain/value-objects/end-session-result.vo';
import type { SessionForceEndCommand } from '../models/session-event-notifications';
import type { ForceEndSessionResultVo } from '../../domain/value-objects/force-end-session-result.vo';
import type { SessionEntity } from '../ports/out/session-snapshot-store.port';
import {
  type IsCheckinResultVo,
  type SessionOperationResultVo,
} from 'src/features/session/domain/value-objects/session-operation-result.vo';
import { SessionOperationsReadVo } from 'src/features/session/domain/value-objects/session-operations-read.vo';
import { SessionOperationsUseCasePort } from '../ports/in/session-operations.use-case.port';
import { SessionEventPublisherPort } from '../ports/out/session-event-publisher.port';
import { ReservationSession } from '../../domain/entities/reservation-session.entity';
import type { RealtimeSession } from '../../domain/entities/realtime-session.entity';
import {
  SessionRuntimePort,
  type SessionRuntimePort as ISessionRuntime,
} from '../ports/out/session-runtime.port';
import {
  EndSessionRecordPort,
  type EndSessionRecordPort as IEndSessionRecordPort,
} from '../ports/out/end-session-record.port';
import {
  EndSessionSnapshotPort,
  type EndSessionSnapshotPort as IEndSessionSnapshotPort,
} from '../ports/out/end-session-snapshot.port';
import { maskEndSessionResultForLog } from '../logging/session-pii-log.util';
import { retryRuntimeEnd } from '../runtime/session-runtime-end-retry';

@Injectable()
export class SessionOperationsService implements SessionOperationsUseCasePort {
  private readonly logger = new Logger(SessionOperationsService.name);

  constructor(
    @Inject(SessionEventPublisherPort)
    private readonly eventPublisher: SessionEventPublisherPort,
    @Inject(SessionRuntimePort)
    private readonly sessionRuntimeManager: ISessionRuntime,
    @Inject(EndSessionRecordPort)
    private readonly endSessionRecord: IEndSessionRecordPort,
    @Inject(EndSessionSnapshotPort)
    private readonly endSessionSnapshot: IEndSessionSnapshotPort,
  ) {}

  isCheckinUser(userId: number): IsCheckinResultVo {
    const isCheckin = this.sessionRuntimeManager.isAlreadyAttendUser(userId);
    return { isCheckin };
  }

  isValidUser(userId: number): boolean {
    const currentSession = this.sessionRuntimeManager.getCurrentSessionStatus();
    if (!currentSession) return false;

    if (this.sessionRuntimeManager.isAlreadyAttendUser(userId)) return true;

    if (currentSession instanceof ReservationSession) {
      return (
        currentSession.participatorIds.some((id) => id == userId) ||
        currentSession.participationAvailable
      );
    }

    return (
      currentSession.creatorId == userId ||
      currentSession.participationAvailable
    );
  }

  async extendSession(
    userId: number,
    sessionId?: string,
  ): Promise<SessionOperationResultVo> {
    const resolvedSessionId = this.resolveOnAirSessionId(sessionId);
    if (!resolvedSessionId) {
      return {
        message: 'FAIL',
        reason: 'NOT_FOUND',
        extendBlockedReason: 'NO_CURRENT_SESSION',
      };
    }

    const session = this.sessionRuntimeManager.getSessionById(resolvedSessionId);
    if (!session) {
      return {
        message: 'FAIL',
        reason: 'NOT_FOUND',
        extendBlockedReason: 'NO_CURRENT_SESSION',
      };
    }

    if (session.status === 'AFTER') {
      return {
        message: 'FAIL',
        reason: 'NOT_ALLOWED',
        extendBlockedReason: 'ALREADY_ENDED',
      };
    }

    if (session.status !== 'ONAIR') {
      return {
        message: 'FAIL',
        reason: 'NOT_FOUND',
        extendBlockedReason: 'NO_CURRENT_SESSION',
      };
    }

    if (!this.isUserAttendingSession(session, userId)) {
      return { message: 'FAIL', reason: 'UNAUTHORIZED' };
    }

    const onAir = this.sessionRuntimeManager.getCurrentSessionStatus();
    if (!onAir || String(onAir.sessionId) !== String(resolvedSessionId)) {
      return {
        message: 'FAIL',
        reason: 'NOT_ALLOWED',
        extendBlockedReason: 'SESSION_ID_MISMATCH',
      };
    }

    const readVo = SessionOperationsReadVo.from(session);
    const now = new Date();

    if (!readVo.canExtend(now)) {
      return {
        message: 'FAIL',
        reason: 'NOT_ALLOWED',
        extendBlockedReason: 'MIN_REMAINING_NOT_MET',
      };
    }

    const maxCapReason = this.sessionRuntimeManager.getExtendMaxCapBlockedReason();
    if (maxCapReason != null) {
      return {
        message: 'FAIL',
        reason: 'NOT_ALLOWED',
        extendBlockedReason: maxCapReason,
      };
    }

    await this.sessionRuntimeManager.extendSession();

    return { message: 'SUCCESS' };
  }

  async endSession(
    userId: number,
    sessionId: string | undefined,
    returnImageUrls: string[],
  ): Promise<EndSessionResultVo> {
    const resolvedSessionId = this.resolveOnAirSessionId(sessionId);
    if (!resolvedSessionId) {
      return {
        message: 'FAIL',
        reason: 'NOT_FOUND',
        endBlockedReason: 'NO_CURRENT_SESSION',
      };
    }

    const session = this.sessionRuntimeManager.getSessionById(resolvedSessionId);
    if (!session) {
      return {
        message: 'FAIL',
        reason: 'NOT_FOUND',
        endBlockedReason: 'NO_CURRENT_SESSION',
      };
    }

    if (session.status === 'AFTER') {
      if (!this.isUserAttendingSession(session, userId)) {
        return { message: 'FAIL', reason: 'UNAUTHORIZED' };
      }
      return {
        message: 'FAIL',
        reason: 'NOT_ALLOWED',
        endBlockedReason: 'ALREADY_ENDED',
      };
    }

    if (session.status !== 'ONAIR') {
      return {
        message: 'FAIL',
        reason: 'NOT_FOUND',
        endBlockedReason: 'NO_CURRENT_SESSION',
      };
    }

    if (!this.isUserAttendingSession(session, userId)) {
      return { message: 'FAIL', reason: 'UNAUTHORIZED' };
    }

    const onAir = this.sessionRuntimeManager.getCurrentSessionStatus();
    if (!onAir || String(onAir.sessionId) !== String(resolvedSessionId)) {
      return {
        message: 'FAIL',
        reason: 'NOT_ALLOWED',
        endBlockedReason: 'SESSION_ID_MISMATCH',
      };
    }

    const readVo = SessionOperationsReadVo.from(session);
    if (!readVo.hasElapsedEnoughToEnd(new Date())) {
      return {
        message: 'FAIL',
        reason: 'NOT_ALLOWED',
        endBlockedReason: 'MIN_ELAPSED_NOT_MET',
      };
    }

    const persistRequest = this.endSessionSnapshot.toPersistRequest({
      session: onAir as RealtimeSession | ReservationSession,
      returnImageUrls,
      forceEnd: false,
    });

    const recordResult = await this.endSessionRecord.record(persistRequest);
    if (recordResult.status === 'failed') {
      if (recordResult.errorCode === 'SESSION_LOG_RPC_TIMEOUT') {
        await this.endSessionRecord.rollback(persistRequest.runtimeSessionId);
      }
      return {
        message: 'FAIL',
        reason: 'NOT_ALLOWED',
        endBlockedReason: this.toEndPersistBlockedReason(recordResult.errorCode),
      };
    }

    // persist 성공 직후 job 제거 — runtime end 실패·재시작에도 orphan job 방지
    await this.sessionRuntimeManager.clearSessionEndTimedJobs(resolvedSessionId);

    const endedSession = await retryRuntimeEnd(
      () => this.sessionRuntimeManager.endSessionById(resolvedSessionId),
      (value): value is RealtimeSession | ReservationSession => {
        if (typeof value === 'undefined') {
          return false;
        }
        return String(value.sessionId) === String(resolvedSessionId);
      },
    );

    if (!endedSession) {
      const afterEnd =
        this.sessionRuntimeManager.getSessionById(resolvedSessionId);
      if (afterEnd?.status === 'AFTER') {
        await this.sessionRuntimeManager.clearSessionEndTimedJobs(
          resolvedSessionId,
        );
        return {
          message: 'FAIL',
          reason: 'NOT_ALLOWED',
          endBlockedReason: 'ALREADY_ENDED',
        };
      }
      return {
        message: 'FAIL',
        reason: 'NOT_ALLOWED',
        endBlockedReason: 'RUNTIME_END_FAILED',
      };
    }

    await this.eventPublisher.publishEndSession({
      sessionId: endedSession.sessionId,
      session: endedSession,
      returnImageUrl: returnImageUrls,
      forceEnd: false,
    });

    const successResult: EndSessionResultVo = {
      message: 'SUCCESS',
      endedSession,
      returnImageUrls,
      forceEnd: false,
      sessionLogDetail:
        recordResult.status === 'created'
          ? recordResult.sessionLog
          : undefined,
    };

    this.logger.debug(
      'endSession completed',
      maskEndSessionResultForLog(successResult),
    );

    return successResult;
  }

  async handleForceEndSession(
    payload: SessionForceEndCommand,
  ): Promise<ForceEndSessionResultVo> {
    const session = this.sessionRuntimeManager.getSessionById(payload.sessionId);
    if (!session) {
      this.logger.warn(
        `force end skipped: session not in runtime list (expectedSessionId=${payload.sessionId})`,
      );
      return { status: 'skipped', skipReason: 'NO_ON_AIR_SESSION' };
    }

    if (session.status === 'AFTER') {
      await this.sessionRuntimeManager.clearSessionEndTimedJobs(
        payload.sessionId,
      );
      this.logger.warn(
        `force end skipped: session already ended (sessionId=${payload.sessionId})`,
      );
      return { status: 'skipped', skipReason: 'ALREADY_ENDED' };
    }

    if (session.status !== 'ONAIR') {
      return { status: 'skipped', skipReason: 'NO_ON_AIR_SESSION' };
    }

    const onAir = this.sessionRuntimeManager.getCurrentSessionStatus();
    if (!onAir || String(onAir.sessionId) !== String(payload.sessionId)) {
      this.logger.warn(
        `force end skipped: session id mismatch (expected=${payload.sessionId}, current=${onAir?.sessionId ?? 'none'})`,
      );
      return { status: 'skipped', skipReason: 'SESSION_ID_MISMATCH' };
    }

    const persistRequest = this.endSessionSnapshot.toPersistRequest({
      session: onAir as RealtimeSession | ReservationSession,
      returnImageUrls: null,
      forceEnd: true,
    });

    const recordResult = await this.endSessionRecord.record(persistRequest);
    if (recordResult.status === 'failed') {
      if (recordResult.errorCode === 'SESSION_LOG_RPC_TIMEOUT') {
        await this.endSessionRecord.rollback(persistRequest.runtimeSessionId);
      }
      return {
        status: 'failed',
        errorCode: recordResult.errorCode,
      };
    }

    const sessionId = String(payload.sessionId);
    await this.sessionRuntimeManager.clearSessionEndTimedJobs(sessionId);

    const runtimeEnded = await retryRuntimeEnd(
      () =>
        this.sessionRuntimeManager.forceEndSessionIfMatching(sessionId),
      (ok) => ok === true,
    );

    if (!runtimeEnded) {
      const afterEnd = this.sessionRuntimeManager.getSessionById(sessionId);
      if (afterEnd?.status === 'AFTER') {
        await this.sessionRuntimeManager.clearSessionEndTimedJobs(sessionId);
        return { status: 'skipped', skipReason: 'ALREADY_ENDED' };
      }
      return { status: 'failed', errorCode: 'RUNTIME_END_FAILED' };
    }

    const endedSession =
      this.sessionRuntimeManager.getSessionById(payload.sessionId) ?? onAir;

    const sessionLogId =
      recordResult.status === 'created'
        ? recordResult.sessionLog.sessionId
        : undefined;

    await this.eventPublisher.publishEndSession({
      sessionId: endedSession.sessionId,
      session: endedSession,
      returnImageUrl: null,
      forceEnd: true,
    });

    return { status: 'success', sessionLogId };
  }

  private resolveOnAirSessionId(sessionId?: string): string | null {
    const trimmed = sessionId?.trim();
    if (trimmed) {
      return trimmed;
    }

    const onAir = this.sessionRuntimeManager.getCurrentSessionStatus();
    if (!onAir || onAir.status !== 'ONAIR') {
      return null;
    }

    return String(onAir.sessionId);
  }

  private isUserAttendingSession(
    session: SessionEntity,
    userId: number,
  ): boolean {
    return session.attendanceList.some(
      (attendance) =>
        attendance.user.memberId == userId && attendance.status !== '결석',
    );
  }

  private toEndPersistBlockedReason(
    errorCode: string,
  ): 'SESSION_LOG_PERSIST_FAILED' | 'SESSION_LOG_RPC_TIMEOUT' {
    return errorCode === 'SESSION_LOG_RPC_TIMEOUT'
      ? 'SESSION_LOG_RPC_TIMEOUT'
      : 'SESSION_LOG_PERSIST_FAILED';
  }
}
