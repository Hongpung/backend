import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import type {
  NoShowDiscardReservationEvent,
  ServerDownDiscardReservationEvent,
} from 'src/contracts/events/event.payload';
import {
  DiscardedReservationRepositoryPort,
  IDiscardedReservationRepository,
} from 'src/features/discarded-reservation/application/ports/out/discarded-reservation.repository.port';

@Injectable()
export class DiscardedReservationEventHandler {
  constructor(
    @Inject(DiscardedReservationRepositoryPort)
    private readonly discardedReservationRepository: IDiscardedReservationRepository,
  ) {}

  @OnEvent(EVENT_TOKEN.NO_SHOW_DISCARD_RESERVATION)
  async handleNoShowDiscardReservation(
    payload: NoShowDiscardReservationEvent,
  ): Promise<void> {
    await this.discardedReservationRepository.saveNoShowByReservationId(
      payload.reservationId,
      'NO_SHOW',
    );
  }

  @OnEvent(EVENT_TOKEN.SERVER_DOWN_DISCARD_RESERVATION)
  async handleServerDownDiscardReservation(
    payload: ServerDownDiscardReservationEvent,
  ): Promise<void> {
    await this.discardedReservationRepository.saveNoShowByReservationId(
      payload.reservationId,
      'SYSTEM_RECOVERY',
    );
  }
}
