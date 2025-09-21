import { Injectable } from '@nestjs/common';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import type { SendNotificationEvent } from 'src/contracts/events/event.payload';
import { EventBus } from 'src/infrastructure/events/event.provider';
import {
  RESERVATION_PUSH_NOTIFICATION_KIND,
  type ReservationConflictCancelledPushNotification,
  type ReservationInvitePushNotification,
  type ReservationParticipatorPushNotification,
  type ReservationPushNotificationRequest,
  type ReservationUpdatedPushNotification,
} from 'src/features/reservation/application/models/reservation-push-notification.model';
import {
  ReservationEventPublisherPort,
} from 'src/features/reservation/application/ports/out/reservation-event-publisher.port';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { buildReservationPushNotification } from './reservation-push-notification.mapper';

@Injectable()
export class ReservationPushNotificationPublisherAdapter
  implements ReservationEventPublisherPort
{
  constructor(private readonly eventBus: EventBus) {}

  async sendLeaveNotification(
    reservation: ReservationEntity,
    leftMemberId: number,
  ): Promise<void> {
    await this.sendPush({
      kind: RESERVATION_PUSH_NOTIFICATION_KIND.LEAVE,
      reservation,
      leftMemberId,
    });
  }

  async sendReservationCanceledNotification(
    reservation: ReservationEntity,
    affectedMemberIds: number[],
  ): Promise<void> {
    if (affectedMemberIds.length === 0 || reservation.reservationId == null) {
      return;
    }

    await this.sendPush({
      kind: RESERVATION_PUSH_NOTIFICATION_KIND.RESERVATION_CANCELED,
      reservationId: reservation.reservationId,
      title: reservation.title,
      affectedMemberIds,
    });
  }

  async sendReservationUpdatedNotification(
    notification: ReservationUpdatedPushNotification,
  ): Promise<void> {
    await this.sendPush({
      kind: RESERVATION_PUSH_NOTIFICATION_KIND.RESERVATION_UPDATED,
      notification,
    });
  }

  async sendCreatedInviteNotification(
    notification: ReservationInvitePushNotification,
  ): Promise<void> {
    if (notification.participatorIds.length === 0) {
      return;
    }

    await this.sendPush({
      kind: RESERVATION_PUSH_NOTIFICATION_KIND.CREATED_INVITE,
      notification,
    });
  }

  async sendUpcomingScheduleNotification(
    reservation: ReservationEntity,
  ): Promise<void> {
    await this.sendPush({
      kind: RESERVATION_PUSH_NOTIFICATION_KIND.UPCOMING_SCHEDULE,
      reservation,
    });
  }

  async sendMorningScheduleNotification(
    reservation: ReservationEntity,
  ): Promise<void> {
    await this.sendPush({
      kind: RESERVATION_PUSH_NOTIFICATION_KIND.MORNING_SCHEDULE,
      reservation,
    });
  }

  async sendNextDayChangeReminderNotification(
    reservation: ReservationEntity,
  ): Promise<void> {
    await this.sendPush({
      kind: RESERVATION_PUSH_NOTIFICATION_KIND.NEXT_DAY_CHANGE_REMINDER,
      reservation,
    });
  }

  async sendAdminConflictCancelledNotification(
    notification: ReservationConflictCancelledPushNotification,
  ): Promise<void> {
    if (notification.participatorIds.length === 0) {
      return;
    }

    await this.sendPush({
      kind: RESERVATION_PUSH_NOTIFICATION_KIND.ADMIN_CONFLICT_CANCELLED,
      notification,
    });
  }

  async sendAdminForceCancelledNotification(
    notification: ReservationParticipatorPushNotification,
  ): Promise<void> {
    if (notification.participatorIds.length === 0) {
      return;
    }

    await this.sendPush({
      kind: RESERVATION_PUSH_NOTIFICATION_KIND.ADMIN_FORCE_CANCELLED,
      notification,
    });
  }

  async sendAdminBatchInviteNotification(
    notification: ReservationInvitePushNotification,
  ): Promise<void> {
    if (notification.participatorIds.length === 0) {
      return;
    }

    await this.sendPush({
      kind: RESERVATION_PUSH_NOTIFICATION_KIND.ADMIN_BATCH_INVITE,
      notification,
    });
  }

  async sendAdminBatchOverlapCancelledNotification(
    notification: ReservationParticipatorPushNotification,
  ): Promise<void> {
    if (notification.participatorIds.length === 0) {
      return;
    }

    await this.sendPush({
      kind: RESERVATION_PUSH_NOTIFICATION_KIND.ADMIN_BATCH_OVERLAP_CANCELLED,
      notification,
    });
  }

  private async sendPush(
    request: ReservationPushNotificationRequest,
  ): Promise<void> {
    const payload = buildReservationPushNotification(request);
    if (!payload) {
      return;
    }

    await this.emitSendNotification(payload);
  }

  private async emitSendNotification(
    payload: SendNotificationEvent,
  ): Promise<void> {
    await this.eventBus.emitAsyncTyped(EVENT_TOKEN.SEND_NOTIFICATION, payload);
  }
}
