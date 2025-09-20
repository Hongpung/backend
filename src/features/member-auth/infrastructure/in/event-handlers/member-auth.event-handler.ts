import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import type { MemberRefreshTokenReusedEvent } from 'src/contracts/events/event.payload';

@Injectable()
export class MemberAuthEventHandler {
  private readonly logger = new Logger(MemberAuthEventHandler.name);

  @OnEvent(EVENT_TOKEN.MEMBER_REFRESH_TOKEN_REUSED)
  handleRefreshTokenReused(payload: MemberRefreshTokenReusedEvent): void {
    this.logger.warn(
      `Refresh token reuse detected memberId=${payload.memberId} sessionId=${payload.sessionId} deviceId=${payload.deviceId}`,
    );
  }
}
