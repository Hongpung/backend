import { Inject, Injectable } from '@nestjs/common';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import {
  ReservationRepositoryPort,
  type IReservationRepository,
} from '../ports/out/reservation.repository.port';
import {
  ReservationEventPublisherPort,
  type ReservationEventPublisherPort as IReservationEventPublisherPort,
} from '../ports/out/reservation-event-publisher.port';

@Injectable()
export class ReservationUpcomingNotificationService {
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly reservationRepository: IReservationRepository,
    @Inject(ReservationEventPublisherPort)
    private readonly eventPublisher: IReservationEventPublisherPort,
  ) {}

  async sendUpcomingByReservationId(reservationId: number): Promise<void> {
    const [reservation] =
      await this.reservationRepository.findReservationsByIds([reservationId]);

    if (!reservation) {
      throw new Error(
        `Reservation ${reservationId} not found for upcoming notification`,
      );
    }

    await this.sendUpcomingForReservation(reservation);
  }

  async sendUpcomingForReservation(reservation: ReservationEntity): Promise<void> {
    await this.eventPublisher.sendUpcomingScheduleNotification(reservation);
  }
}
