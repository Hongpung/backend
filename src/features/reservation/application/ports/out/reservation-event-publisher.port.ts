import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import type {
  ReservationConflictCancelledPushNotification,
  ReservationInvitePushNotification,
  ReservationParticipatorPushNotification,
  ReservationUpdatedPushNotification,
} from '../../models/reservation-push-notification.model';

export const ReservationEventPublisherPort = Symbol(
  'ReservationEventPublisherPort',
);

export interface ReservationEventPublisherPort {
  sendLeaveNotification(
    reservation: ReservationEntity,
    leftMemberId: number,
  ): Promise<void>;

  sendReservationCanceledNotification(
    reservation: ReservationEntity,
    affectedMemberIds: number[],
  ): Promise<void>;

  sendReservationUpdatedNotification(
    notification: ReservationUpdatedPushNotification,
  ): Promise<void>;

  sendCreatedInviteNotification(
    notification: ReservationInvitePushNotification,
  ): Promise<void>;

  sendUpcomingScheduleNotification(
    reservation: ReservationEntity,
  ): Promise<void>;

  sendMorningScheduleNotification(
    reservation: ReservationEntity,
  ): Promise<void>;

  sendNextDayChangeReminderNotification(
    reservation: ReservationEntity,
  ): Promise<void>;

  sendAdminConflictCancelledNotification(
    notification: ReservationConflictCancelledPushNotification,
  ): Promise<void>;

  sendAdminForceCancelledNotification(
    notification: ReservationParticipatorPushNotification,
  ): Promise<void>;

  sendAdminBatchInviteNotification(
    notification: ReservationInvitePushNotification,
  ): Promise<void>;

  sendAdminBatchOverlapCancelledNotification(
    notification: ReservationParticipatorPushNotification,
  ): Promise<void>;
}
