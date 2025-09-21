import { Inject, Injectable } from '@nestjs/common';
import { ReservationEventPublisherPort } from 'src/features/reservation/application/ports/out/reservation-event-publisher.port';

@Injectable()
export class ReservationCreatedEventPublisherService {
  constructor(
    @Inject(ReservationEventPublisherPort)
    private readonly eventPublisher: ReservationEventPublisherPort,
  ) {}

  publishCreated(
    reservationId: number,
    _memberId: number,
    title: string,
    participatorIds: number[],
  ): void {
    void this.eventPublisher.sendCreatedInviteNotification({
      reservationId,
      title,
      participatorIds,
    });
  }
}
