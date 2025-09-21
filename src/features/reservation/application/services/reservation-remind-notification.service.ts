import { Inject, Injectable, Logger } from '@nestjs/common';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import {
  ReservationEventPublisherPort,
  type ReservationEventPublisherPort as IReservationEventPublisherPort,
} from '../ports/out/reservation-event-publisher.port';
import {
  ReservationSchedulerReadPort,
  type ReservationSchedulerReadPort as IReservationSchedulerReadPort,
} from '../ports/out/reservation-scheduler-read.port';

@Injectable()
export class ReservationRemindNotificationService {
  private readonly logger = new Logger(ReservationRemindNotificationService.name);

  constructor(
    @Inject(ReservationSchedulerReadPort)
    private readonly schedulerRead: IReservationSchedulerReadPort,
    @Inject(ReservationEventPublisherPort)
    private readonly eventPublisher: IReservationEventPublisherPort,
  ) {}

  async sendMorningRemindersForToday(): Promise<void> {
    const reservations = await this.schedulerRead.findTodayForReminders();
    await this.sendMorningReminders(reservations);
  }

  async sendNextDayReminders(): Promise<void> {
    const reservations = await this.schedulerRead.findTomorrowForReminders();
    await this.sendNextDayRemindersForReservations(reservations);
  }

  private async sendMorningReminders(
    reservations: ReservationEntity[],
  ): Promise<void> {
    const notificationTasks = reservations.map(async (reservation) => {
      await this.eventPublisher.sendMorningScheduleNotification(reservation);
    });

    const results = await Promise.allSettled(notificationTasks);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logNotificationFailure(
          'sendMorningReminders',
          reservations[index].reservationId,
          result.reason,
        );
      }
    });
  }

  private async sendNextDayRemindersForReservations(
    reservations: ReservationEntity[],
  ): Promise<void> {
    const regularReservations = reservations.filter(
      (reservation) => reservation.reservationType !== 'EXTERNAL',
    );
    const notificationTasks = regularReservations.map(async (reservation) => {
      await this.eventPublisher.sendNextDayChangeReminderNotification(
        reservation,
      );
    });

    const results = await Promise.allSettled(notificationTasks);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logNotificationFailure(
          'sendNextDayRemindersForReservations',
          regularReservations[index].reservationId,
          result.reason,
        );
      }
    });
  }

  private logNotificationFailure(
    method: string,
    reservationId: number | null | undefined,
    reason: unknown,
  ): void {
    this.logger.error(
      `[${method}] Failed to schedule notification for reservation: ${reservationId}`,
      reason,
    );
  }
}
