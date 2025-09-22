import type { SessionReservationType } from '../../domain/value-objects/session-reservation-type.vo';

export type SessionPushAttendanceSnapshot = {
  memberId: number;
  status: string;
};

/** Bull job wire payload에서 추린 세션 푸시 스냅샷 */
export type SessionPushSessionSnapshot = {
  sessionId: string | number;
  title: string;
  sessionType: 'REALTIME' | 'RESERVED';
  reservationType?: SessionReservationType;
  attendance: SessionPushAttendanceSnapshot[];
};

export const SESSION_PUSH_NOTIFICATION_KIND = {
  FORCE_END: 'FORCE_END',
  FORCE_END_ALARM: 'FORCE_END_ALARM',
  NO_SHOW_DISCARD: 'NO_SHOW_DISCARD',
} as const;

export type SessionPushNotificationKind =
  (typeof SESSION_PUSH_NOTIFICATION_KIND)[keyof typeof SESSION_PUSH_NOTIFICATION_KIND];

/** 세션 도메인 맥락에서 회원 대상 푸시 발송 요청 (application 모델) */
export type SessionMemberPushNotification =
  | {
      kind: typeof SESSION_PUSH_NOTIFICATION_KIND.FORCE_END;
      memberIds: number[];
      sessionTitle: string;
      sessionLogId: number;
    }
  | {
      kind: Exclude<
        SessionPushNotificationKind,
        typeof SESSION_PUSH_NOTIFICATION_KIND.FORCE_END
      >;
      memberIds: number[];
      sessionTitle: string;
    };
