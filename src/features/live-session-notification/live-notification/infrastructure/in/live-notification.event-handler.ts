import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import type {
  EndSessionEvent,
  SessionExtendEvent,
} from 'src/contracts/events/event.payload';
import { LiveNotificationService } from '../../application/live-notification.service';
import { toExtendSessionLiveNotificationInput } from './mappers/session-extend-live-notification.mapper';

@Injectable()
export class LiveNotificationEventHandler {
  constructor(
    private readonly liveNotificationService: LiveNotificationService,
  ) {}

  @OnEvent(EVENT_TOKEN.EXTEND_SESSION)
  async handleExtendSession(payload: SessionExtendEvent): Promise<void> { 
    await this.liveNotificationService.extendSessionLiveNotifications(
      toExtendSessionLiveNotificationInput(payload),
    );
  }

  @OnEvent(EVENT_TOKEN.END_SESSION)
  async handleEndSession(payload: EndSessionEvent): Promise<void> {
    await this.liveNotificationService.endSessionLiveNotifications(
      payload.sessionId,
    );
  }
}
