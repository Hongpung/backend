import { Injectable, Logger } from '@nestjs/common';
import { ReservationUpcomingNotificationService } from 'src/features/reservation/application/services/reservation-upcoming-notification.service';
import type { ReservationSerializedDto } from './reservation-serialized.dto';
import { ReservationSerializationMapper } from './mappers/reservation-serialization.mapper';

/** BullMQ inbound: job payload → application upcoming notification */
@Injectable()
export class ReservationQueueUpcomingNotificationInHandler {
  private readonly logger = new Logger(
    ReservationQueueUpcomingNotificationInHandler.name,
  );

  constructor(
    private readonly upcomingNotification: ReservationUpcomingNotificationService,
  ) {}

  async handleSendUpcomingNotification(
    serialized: ReservationSerializedDto,
  ): Promise<void> {
    const reservation =
      ReservationSerializationMapper.fromSerialized(serialized);
    await this.upcomingNotification.sendUpcomingForReservation(reservation);
    this.logger.log(
      `Sending upcoming notification for reservation: ${reservation.title}`,
    );
  }
}
