import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SessionRuntimeManager } from 'src/features/session/application/runtime/session-runtime.manager';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import type { ServerDownDiscardReservationEvent } from 'src/contracts/events/event.payload';

@Injectable()
export class SessionRuntimeSubscriber {
  constructor(private readonly sessionRuntimeManager: SessionRuntimeManager) {}

  @OnEvent(EVENT_TOKEN.SESSION_LIST_CHANGED)
  async onSessionListChanged(): Promise<void> {
    await this.sessionRuntimeManager.onSessionListChanged();
  }

  @OnEvent(EVENT_TOKEN.SERVER_DOWN_DISCARD_RESERVATION)
  onServerDownDiscardReservation(
    payload: ServerDownDiscardReservationEvent,
  ): void {
    this.sessionRuntimeManager.onDiscardReservation(payload);
  }
}
