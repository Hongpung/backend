import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import type {
  EndSessionEvent,
  SessionExtendEvent,
} from 'src/contracts/events/event.payload';
import { LiveActivityService } from '../../application/live-activity.service';

@Injectable()
export class LiveActivityEventHandler {
  constructor(private readonly liveActivityService: LiveActivityService) {}

  @OnEvent(EVENT_TOKEN.EXTEND_SESSION)
  async handleExtendSession(payload: SessionExtendEvent): Promise<void> {
    await this.liveActivityService.extendSessionLiveActivities(payload);
  }

  @OnEvent(EVENT_TOKEN.END_SESSION)
  async handleEndSession(payload: EndSessionEvent): Promise<void> {
    await this.liveActivityService.endSessionLiveActivities(payload.sessionId);
  }
}
