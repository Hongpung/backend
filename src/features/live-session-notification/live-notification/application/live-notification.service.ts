import { Inject, Injectable, Logger } from '@nestjs/common';
import type { LiveNotificationUseCasePort } from './ports/in/live-notification.use-case.port';
import type {
  ExtendSessionLiveNotificationInput,
  LiveNotificationInfo,
  RegisterLiveNotificationInput,
  SendLiveNotificationInput,
} from './live-notification.model';
import {
  LiveNotificationMemberLookupPort,
  type LiveNotificationMemberLookupPort as ILiveNotificationMemberLookupPort,
} from './ports/out/live-notification-member-lookup.port';
import {
  ILiveNotificationPushPort,
  LiveNotificationPushPort,
} from './ports/out/live-notification-push.port';
import {
  ILiveNotificationStatePort,
  LiveNotificationStatePort,
} from './ports/out/live-notification-state.port';

@Injectable()
export class LiveNotificationService implements LiveNotificationUseCasePort {
  private readonly logger = new Logger(LiveNotificationService.name);

  constructor(
    @Inject(LiveNotificationStatePort)
    private readonly liveNotificationState: ILiveNotificationStatePort,
    @Inject(LiveNotificationPushPort)
    private readonly liveNotificationPush: ILiveNotificationPushPort,
    @Inject(LiveNotificationMemberLookupPort)
    private readonly memberLookup: ILiveNotificationMemberLookupPort,
  ) {}

  async registerLiveNotification(
    input: RegisterLiveNotificationInput,
    memberId: number,
  ): Promise<void> {
    const { sessionId } = input;
    const member = await this.memberLookup.loadMemberForRegistration(memberId);

    const liveNotificationInfo: LiveNotificationInfo = {
      memberId: member.memberId,
      sessionId,
      expoToken: member.expoToken,
      registeredAt: Math.floor(Date.now() / 1000),
    };

    await this.liveNotificationState.register(liveNotificationInfo);

    this.logger.log(
      `Live Notification registered for session ${sessionId}: ${member.memberId}`,
    );
  }

  async getLiveNotification(
    memberId: number,
    sessionId: number | string,
  ): Promise<LiveNotificationInfo | null> {
    return this.liveNotificationState.find(memberId, sessionId);
  }

  async getAllLiveNotificationsForSession(
    sessionId: number | string,
  ): Promise<LiveNotificationInfo[]> {
    try {
      return await this.liveNotificationState.findAllBySession(sessionId);
    } catch (error) {
      this.logger.error(
        `Error getting Live Notifications for session: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  async sendLiveNotification(input: SendLiveNotificationInput): Promise<void> {
    const { sessionId, action, endTime } = input;
    const liveNotifications =
      await this.getAllLiveNotificationsForSession(sessionId);

    if (liveNotifications.length === 0) {
      this.logger.warn(`No Live Notifications found for session ${sessionId}`);
      return;
    }

    const expoTokens = liveNotifications.flatMap((liveNotification) =>
      liveNotification.expoToken ? [liveNotification.expoToken] : [],
    );

    const data: Record<string, any> = {
      type: action,
    };

    if (action === 'SESSION_EXTEND') {
      if (endTime === undefined) {
        throw new Error('SESSION_EXTEND에는 endTime이 필요합니다.');
      }
      data.endsAt = endTime * 1000;
    }

    this.logger.log(`expoTokens=${expoTokens} data=${JSON.stringify(data)}`);

    if (expoTokens.length > 0) {
      try {
        await this.liveNotificationPush.sendLiveNotification(
          expoTokens,
          data,
          'high',
        );
        this.logger.log(
          `Expo live notifications sent to ${expoTokens.length} devices for session ${sessionId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send Expo live notifications: ${error.message}`,
        );
        throw error;
      }
    } else {
      this.logger.warn(`No valid Expo tokens found for session ${sessionId}`);
    }
  }

  async extendSessionLiveNotifications(
    payload: ExtendSessionLiveNotificationInput,
  ): Promise<void> {
    const { sessionId, remainingMsUntilPreviousEnd, endTimeMs } = payload;
    if (sessionId == null || remainingMsUntilPreviousEnd == null) {
      this.logger.warn(
        'extend-session: sessionId 또는 endTime 없음 — 이벤트 페이로드 확인',
      );
      return;
    }

    try {
      const memberIds =
        await this.liveNotificationState.getSessionMemberIds(sessionId);
      let extendedCount = 0;

      for (const memberId of memberIds) {
        try {
          const liveNotification = await this.liveNotificationState.find(
            memberId,
            sessionId,
          );

          if (liveNotification) {
            liveNotification.registeredAt = Math.floor(Date.now() / 1000);
            await this.liveNotificationState.save(liveNotification);
            extendedCount++;
          }
        } catch (error) {
          this.logger.error(
            `Error extending Live Notification for memberId ${memberId}: ${error.message}`,
            error.stack,
          );
        }
      }

      if (extendedCount > 0) {
        const endTimeSeconds =
          endTimeMs != null && !Number.isNaN(endTimeMs)
            ? Math.floor(endTimeMs / 1000)
            : Math.floor(remainingMsUntilPreviousEnd / 1000);
        await this.sendLiveNotification({
          sessionId,
          action: 'SESSION_EXTEND',
          endTime: endTimeSeconds,
        });
      }

      this.logger.log(
        `Extended ${extendedCount} Live Notifications for session: ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error extending session Live Notifications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async endSessionLiveNotifications(
    sessionId: number | string,
  ): Promise<void> {
    if (sessionId == null) {
      this.logger.warn('end-session: sessionId 없음 — 이벤트 페이로드 확인');
      return;
    }

    try {
      const memberIds =
        await this.liveNotificationState.getSessionMemberIds(sessionId);

      if (memberIds.length > 0) {
        try {
          await this.sendLiveNotification({
            sessionId,
            action: 'SESSION_END',
          });
        } catch (error) {
          this.logger.error(
            `Error sending SESSION_END notification: ${error.message}`,
            error.stack,
          );
        }
      }

      await this.liveNotificationState.clearSession(sessionId);

      this.logger.log(
        `Ended ${memberIds.length} Live Notifications for session: ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error ending session Live Notifications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
