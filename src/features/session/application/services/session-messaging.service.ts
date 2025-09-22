import { Inject, Injectable } from '@nestjs/common';
import type { ReservationSession } from '../../domain/entities/reservation-session.entity';
import {
  SESSION_PUSH_NOTIFICATION_KIND,
  type SessionPushSessionSnapshot,
} from '../models/session-push-notification.model';
import {
  SessionPushNotificationPort,
  type SessionPushNotificationPort as ISessionPushNotificationPort,
} from '../ports/out/session-push-notification.port';
import {
  SessionRuntimePort,
  type SessionRuntimePort as ISessionRuntimePort,
} from '../ports/out/session-runtime.port';

@Injectable()
export class SessionMessagingService {
  constructor(
    @Inject(SessionPushNotificationPort)
    private readonly pushNotification: ISessionPushNotificationPort,
    @Inject(SessionRuntimePort)
    private readonly sessionRuntime: ISessionRuntimePort,
  ) {}

  async notifyForceEnd(
    snapshot: SessionPushSessionSnapshot,
    sessionLogId: number,
  ): Promise<void> {
    if (this.isExternalReservation(snapshot)) {
      return;
    }

    const memberIds = this.resolvePushRecipientMemberIds(snapshot);
    await this.pushNotification.sendMemberPush({
      kind: SESSION_PUSH_NOTIFICATION_KIND.FORCE_END,
      memberIds,
      sessionTitle: snapshot.title,
      sessionLogId,
    });
  }

  async notifyForceEndAlarm(snapshot: SessionPushSessionSnapshot): Promise<void> {
    if (this.isExternalReservation(snapshot)) {
      return;
    }

    const memberIds = this.resolvePushRecipientMemberIds(snapshot);
    await this.pushNotification.sendMemberPush({
      kind: SESSION_PUSH_NOTIFICATION_KIND.FORCE_END_ALARM,
      memberIds,
      sessionTitle: snapshot.title,
    });
  }

  async notifyNoShowDiscardForReservation(
    session: ReservationSession,
  ): Promise<void> {
    await this.notifyNoShowDiscard({
      sessionId: session.sessionId,
      title: session.title,
      sessionType: 'RESERVED',
      reservationType: session.reservationType,
      attendance: session.attendanceList.map(({ user, status }) => ({
        memberId: user.memberId,
        status,
      })),
    });
  }

  async notifyNoShowDiscard(snapshot: SessionPushSessionSnapshot): Promise<void> {
    if (snapshot.reservationType === 'EXTERNAL') {
      return;
    }

    const memberIds = snapshot.attendance.map(({ memberId }) => memberId);
    await this.pushNotification.sendMemberPush({
      kind: SESSION_PUSH_NOTIFICATION_KIND.NO_SHOW_DISCARD,
      memberIds,
      sessionTitle: snapshot.title,
    });
  }

  /** job 등록 시점 출석 스냅샷 대신, 알림 직전 ONAIR 출석 목록을 우선한다. */
  private resolvePushRecipientMemberIds(
    snapshot: SessionPushSessionSnapshot,
  ): number[] {
    const liveMemberIds = this.sessionRuntime.getOnairAttendanceMemberIds(
      snapshot.sessionId,
    );
    if (liveMemberIds.length > 0) {
      return liveMemberIds;
    }

    return snapshot.attendance
      .filter(({ status }) => status !== '결석')
      .map(({ memberId }) => memberId);
  }

  private isExternalReservation(snapshot: SessionPushSessionSnapshot): boolean {
    return (
      snapshot.sessionType === 'RESERVED' &&
      snapshot.reservationType === 'EXTERNAL'
    );
  }
}
