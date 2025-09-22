import { Injectable } from '@nestjs/common';
import { ReservationUpcomingNotificationService } from 'src/features/reservation/application/services/reservation-upcoming-notification.service';
import { SessionReservationRemindPort } from '../../../application/ports/out/session-reservation-remind.port';

@Injectable()
export class SessionReservationRemindAdapter implements SessionReservationRemindPort {
  constructor(
    private readonly reservationUpcomingNotification: ReservationUpcomingNotificationService,
  ) {}

  async sendUpcomingScheduleNotification(reservationId: number): Promise<void> {
    await this.reservationUpcomingNotification.sendUpcomingByReservationId(
      reservationId,
    );
  }
}
