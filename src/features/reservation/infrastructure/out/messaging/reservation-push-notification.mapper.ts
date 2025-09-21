import { josa } from 'es-hangul';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import {
  buildReservationDeepLink,
  pushNotificationDataWithUrl,
} from 'src/contracts/deep-link/deep-link';
import type { SendNotificationEvent } from 'src/contracts/events/event.payload';
import {
  RESERVATION_PUSH_NOTIFICATION_KIND,
  type ReservationConflictCancelledPushNotification,
  type ReservationInvitePushNotification,
  type ReservationParticipatorPushNotification,
  type ReservationPushNotificationRequest,
  type ReservationUpdatedPushNotification,
} from 'src/features/reservation/application/models/reservation-push-notification.model';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';

const RESERVATION_UPDATED_TITLE_MAX_LENGTH = 8;

function truncateTitle(title: string, maxLength = 10): string {
  return title.length > maxLength
    ? title.substring(0, maxLength) + '...'
    : title;
}

/** 예약 startTime(`HH:mm` / DB time) → 푸시 본문용 `14시 30분`. */
function formatReservationStartTimeLabel(time: string): string {
  const hm = AppKstDateTime.deserializeReservationTimeToHHmm(time);
  const [hour, minute] = hm.split(':').map((v) => parseInt(v, 10));
  return minute === 0 ? `${hour}시` : `${hour}시 ${minute}분`;
}

function requireMemberCreator(
  creator: ReservationCreator | string | undefined,
): ReservationCreator | null {
  if (!creator || typeof creator === 'string') {
    return null;
  }
  return creator;
}

export function buildReservationPushNotification(
  request: ReservationPushNotificationRequest,
): SendNotificationEvent | null {
  switch (request.kind) {
    case RESERVATION_PUSH_NOTIFICATION_KIND.LEAVE:
      return buildLeaveNotification(request.reservation, request.leftMemberId);
    case RESERVATION_PUSH_NOTIFICATION_KIND.RESERVATION_CANCELED:
      return buildReservationCanceledNotification(
        request.reservationId,
        request.title,
        request.affectedMemberIds,
      );
    case RESERVATION_PUSH_NOTIFICATION_KIND.RESERVATION_UPDATED:
      return buildReservationUpdatedNotification(request.notification);
    case RESERVATION_PUSH_NOTIFICATION_KIND.CREATED_INVITE:
      return buildReservationCreatedInviteNotification(request.notification);
    case RESERVATION_PUSH_NOTIFICATION_KIND.UPCOMING_SCHEDULE:
      return buildUpcomingScheduleNotification(request.reservation);
    case RESERVATION_PUSH_NOTIFICATION_KIND.MORNING_SCHEDULE:
      return buildMorningScheduleNotification(request.reservation);
    case RESERVATION_PUSH_NOTIFICATION_KIND.NEXT_DAY_CHANGE_REMINDER:
      return buildNextDayChangeReminderNotification(request.reservation);
    case RESERVATION_PUSH_NOTIFICATION_KIND.ADMIN_CONFLICT_CANCELLED:
      return buildAdminConflictCancelledNotification(request.notification);
    case RESERVATION_PUSH_NOTIFICATION_KIND.ADMIN_FORCE_CANCELLED:
      return buildAdminForceCancelledNotification(request.notification);
    case RESERVATION_PUSH_NOTIFICATION_KIND.ADMIN_BATCH_INVITE:
      return buildAdminBatchCreatedNotification(request.notification);
    case RESERVATION_PUSH_NOTIFICATION_KIND.ADMIN_BATCH_OVERLAP_CANCELLED:
      return buildAdminBatchOverlapCancelledNotification(request.notification);
    default: {
      const _exhaustive: never = request;
      return _exhaustive;
    }
  }
}

export function buildReservationCreatedInviteNotification(
  notification: ReservationInvitePushNotification,
): SendNotificationEvent {
  return {
    to: notification.participatorIds,
    title: '예약 초대',
    body: `${notification.title} 예약에 초대되었습니다.`,
    data: pushNotificationDataWithUrl(
      buildReservationDeepLink(notification.reservationId),
    ),
  };
}

export function buildReservationCanceledNotification(
  reservationId: number,
  title: string,
  affectedMemberIds: number[],
): SendNotificationEvent {
  return {
    to: affectedMemberIds,
    title: '예약 취소',
    body: `${title} 예약이 취소되었습니다.`,
    data: pushNotificationDataWithUrl(buildReservationDeepLink(reservationId)),
  };
}

export function buildLeaveNotification(
  reservation: ReservationEntity,
  leftMemberId: number,
): SendNotificationEvent | null {
  const creator = requireMemberCreator(reservation.creator);
  if (!creator || reservation.reservationId == null) {
    return null;
  }

  const truncatedTitle = truncateTitle(reservation.title);

  return {
    to: [creator.memberId],
    title: '예약 참여 취소',
    body: `${josa(truncatedTitle, '이/가')} 예약에서 참여자가 나갔습니다.`,
    data: pushNotificationDataWithUrl(
      buildReservationDeepLink(reservation.reservationId),
    ),
  };
}

export function buildUpcomingScheduleNotification(
  reservation: ReservationEntity,
): SendNotificationEvent | null {
  if (reservation.participators.length === 0) {
    return null;
  }

  const truncatedTitle = truncateTitle(reservation.title);

  return {
    to: reservation.participators.map((user) => user.memberId),
    title: '오늘의 연습실 예약',
    body:
      josa(truncatedTitle, '이/가') +
      ' ' +
      formatReservationStartTimeLabel(reservation.startTime) +
      '에 시작됩니다.\n늦지 않고 시간안에 도착해야해요.',
    data: pushNotificationDataWithUrl(
      buildReservationDeepLink(reservation.reservationId!),
    ),
  };
}

export function buildMorningScheduleNotification(
  reservation: ReservationEntity,
): SendNotificationEvent | null {
  if (reservation.participators.length === 0) {
    return null;
  }

  const truncatedTitle = truncateTitle(reservation.title);

  return {
    to: reservation.participators.map((user) => user.memberId),
    title: '오늘의 연습실 예약',
    body:
      josa(truncatedTitle, '이/가') +
      ' ' +
      reservation.startTime +
      '에 시작됩니다.\n늦지 않고 시간안에 도착해야해요.',
    data: pushNotificationDataWithUrl(
      buildReservationDeepLink(reservation.reservationId!),
    ),
  };
}

export function buildNextDayChangeReminderNotification(
  reservation: ReservationEntity,
): SendNotificationEvent | null {
  const creator = requireMemberCreator(reservation.creator);
  if (!creator) {
    return null;
  }

  return {
    to: [creator.memberId],
    title: '예약 변경 가능시간 안내',
    body: '22시 이후엔 변경이 불가능 해요.\n변경할 항목이 있다면 지금 빨리 해요.',
    data: pushNotificationDataWithUrl(
      buildReservationDeepLink(reservation.reservationId!),
    ),
  };
}

export function buildReservationUpdatedNotification(
  notification: ReservationUpdatedPushNotification,
): SendNotificationEvent {
  const truncatedTitle = truncateTitle(
    notification.reservationTitle,
    RESERVATION_UPDATED_TITLE_MAX_LENGTH,
  );

  return {
    to: notification.affectedMemberIds,
    title: '예약 정보 변경',
    body: `${truncatedTitle}에 변경사항이 생겼어요.\n지금 확인해보세요.`,
    data: pushNotificationDataWithUrl(
      buildReservationDeepLink(notification.reservationId),
    ),
  };
}

export function buildAdminConflictCancelledNotification(
  notification: ReservationConflictCancelledPushNotification,
): SendNotificationEvent {
  return {
    to: notification.participatorIds,
    title: '예약 취소 안내',
    body: `${notification.title} 예약이 관리자에 의해 취소되었습니다.`,
    data: pushNotificationDataWithUrl(
      buildReservationDeepLink(notification.reservationId),
    ),
  };
}

export function buildAdminForceCancelledNotification(
  notification: ReservationParticipatorPushNotification,
): SendNotificationEvent {
  return buildAdminConflictCancelledNotification(notification);
}

export function buildAdminBatchOverlapCancelledNotification(
  notification: ReservationParticipatorPushNotification,
): SendNotificationEvent {
  return {
    to: notification.participatorIds,
    title: '예약 취소 안내',
    body: `관리자에 의해 ${notification.title} 예약이 취소되었어요.\n질문 사항이 있다면 의장에게 문의해요.`,
    data: pushNotificationDataWithUrl(
      buildReservationDeepLink(notification.reservationId),
    ),
  };
}

export function buildAdminBatchCreatedNotification(
  notification: ReservationInvitePushNotification,
): SendNotificationEvent {
  return {
    to: notification.participatorIds,
    title: '예약 생성 안내',
    body: `${notification.title} 예약이 생성되었어요.\n예약 정보를 확인해주세요.`,
    data: pushNotificationDataWithUrl(
      buildReservationDeepLink(notification.reservationId),
    ),
  };
}
