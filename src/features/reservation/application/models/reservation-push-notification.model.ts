import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';

/** 예약 도메인 맥락에서 회원 대상 푸시 발송 요청 (application 모델) */
export type ReservationUpdatedPushNotification = {
  reservationId: number;
  updatedBy: number;
  changes: Record<string, unknown>;
  affectedMemberIds: number[];
  reservationTitle: string;
};

export type ReservationConflictCancelledPushNotification = {
  reservationId: number;
  title: string;
  participatorIds: number[];
};

export type ReservationInvitePushNotification = {
  reservationId: number;
  title: string;
  participatorIds: number[];
};

export type ReservationParticipatorPushNotification = {
  reservationId: number;
  title: string;
  participatorIds: number[];
};

export const RESERVATION_PUSH_NOTIFICATION_KIND = {
  LEAVE: 'LEAVE',
  RESERVATION_CANCELED: 'RESERVATION_CANCELED',
  RESERVATION_UPDATED: 'RESERVATION_UPDATED',
  CREATED_INVITE: 'CREATED_INVITE',
  UPCOMING_SCHEDULE: 'UPCOMING_SCHEDULE',
  MORNING_SCHEDULE: 'MORNING_SCHEDULE',
  NEXT_DAY_CHANGE_REMINDER: 'NEXT_DAY_CHANGE_REMINDER',
  ADMIN_CONFLICT_CANCELLED: 'ADMIN_CONFLICT_CANCELLED',
  ADMIN_FORCE_CANCELLED: 'ADMIN_FORCE_CANCELLED',
  ADMIN_BATCH_INVITE: 'ADMIN_BATCH_INVITE',
  ADMIN_BATCH_OVERLAP_CANCELLED: 'ADMIN_BATCH_OVERLAP_CANCELLED',
} as const;

export type ReservationPushNotificationKind =
  (typeof RESERVATION_PUSH_NOTIFICATION_KIND)[keyof typeof RESERVATION_PUSH_NOTIFICATION_KIND];

export type ReservationPushNotificationRequest =
  | {
      kind: typeof RESERVATION_PUSH_NOTIFICATION_KIND.LEAVE;
      reservation: ReservationEntity;
      leftMemberId: number;
    }
  | {
      kind: typeof RESERVATION_PUSH_NOTIFICATION_KIND.RESERVATION_CANCELED;
      reservationId: number;
      title: string;
      affectedMemberIds: number[];
    }
  | {
      kind: typeof RESERVATION_PUSH_NOTIFICATION_KIND.RESERVATION_UPDATED;
      notification: ReservationUpdatedPushNotification;
    }
  | {
      kind: typeof RESERVATION_PUSH_NOTIFICATION_KIND.CREATED_INVITE;
      notification: ReservationInvitePushNotification;
    }
  | {
      kind: typeof RESERVATION_PUSH_NOTIFICATION_KIND.UPCOMING_SCHEDULE;
      reservation: ReservationEntity;
    }
  | {
      kind: typeof RESERVATION_PUSH_NOTIFICATION_KIND.MORNING_SCHEDULE;
      reservation: ReservationEntity;
    }
  | {
      kind: typeof RESERVATION_PUSH_NOTIFICATION_KIND.NEXT_DAY_CHANGE_REMINDER;
      reservation: ReservationEntity;
    }
  | {
      kind: typeof RESERVATION_PUSH_NOTIFICATION_KIND.ADMIN_CONFLICT_CANCELLED;
      notification: ReservationConflictCancelledPushNotification;
    }
  | {
      kind: typeof RESERVATION_PUSH_NOTIFICATION_KIND.ADMIN_FORCE_CANCELLED;
      notification: ReservationParticipatorPushNotification;
    }
  | {
      kind: typeof RESERVATION_PUSH_NOTIFICATION_KIND.ADMIN_BATCH_INVITE;
      notification: ReservationInvitePushNotification;
    }
  | {
      kind: typeof RESERVATION_PUSH_NOTIFICATION_KIND.ADMIN_BATCH_OVERLAP_CANCELLED;
      notification: ReservationParticipatorPushNotification;
    };
