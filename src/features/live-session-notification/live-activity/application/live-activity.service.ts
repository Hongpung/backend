import { Inject, Injectable, Logger } from '@nestjs/common';
import type { LiveActivityUseCasePort } from './ports/in/live-activity.use-case.port';
import type {
  LiveActivityInfo,
  RegisterLiveActivityInput,
  UpdateLiveActivityInput,
} from './live-activity.model';
import type { SessionExtendEvent } from 'src/contracts/events/event.payload';
import {
  ILiveActivityPushPort,
  LiveActivityPushPort,
} from './ports/out/live-activity-push.port';
import {
  ILiveActivityStatePort,
  LiveActivityStatePort,
} from './ports/out/live-activity-state.port';

@Injectable()
export class LiveActivityService implements LiveActivityUseCasePort {
  private readonly logger = new Logger(LiveActivityService.name);
  private readonly topic = 'com.widepants.HongPung';

  constructor(
    @Inject(LiveActivityStatePort)
    private readonly liveActivityState: ILiveActivityStatePort,
    @Inject(LiveActivityPushPort)
    private readonly liveActivityPush: ILiveActivityPushPort,
  ) {}

  async registerLiveActivity(
    memberId: number,
    input: RegisterLiveActivityInput,
  ): Promise<void> {
    const { sessionId, apnsToken } = input;
    const nowSeconds = Math.floor(Date.now() / 1000);

    this.logger.log(`memberId=${memberId} apnsToken = ${apnsToken}`);
    const liveActivityInfo: LiveActivityInfo = {
      memberId,
      sessionId,
      apnsToken,
      topic: this.topic,
      registeredAt: nowSeconds,
      lastUpdated: nowSeconds,
    };

    await this.liveActivityState.register(liveActivityInfo);

    this.logger.log(
      `Live Activity registered: memberId=${memberId}, sessionId=${sessionId}`,
    );
  }

  async getLiveActivity(
    memberId: number,
    sessionId: number | string,
  ): Promise<LiveActivityInfo | null> {
    const data = await this.liveActivityState.find(memberId, sessionId);
    this.logger.log(
      `Live Activity lookup: memberId=${memberId}, sessionId=${sessionId}`,
    );
    return data;
  }

  async updateLiveActivity(
    memberId: number,
    input: UpdateLiveActivityInput,
  ): Promise<void> {
    const { sessionId, contentState } = input;
    const liveActivity = await this.getLiveActivity(memberId, sessionId);

    if (!liveActivity) {
      this.logger.warn(
        `Live Activity not found: memberId=${memberId}, sessionId=${sessionId}`,
      );
      return;
    }

    liveActivity.lastUpdated = Date.now();
    await this.liveActivityState.save(liveActivity);

    this.logger.log(
      `try to update Live Activity: memberId=${memberId}, sessionId=${sessionId}`,
    );
    await this.liveActivityPush.sendLiveActivityUpdate({
      deviceToken: liveActivity.apnsToken,
      topic: liveActivity.topic,
      event: 'update',
      contentState,
      timestamp: liveActivity.lastUpdated,
    });

    this.logger.log(
      `Live Activity updated: memberId=${memberId}, sessionId=${sessionId}`,
    );
  }

  async endLiveActivity(
    memberId: number,
    sessionId: number | string,
  ): Promise<void> {
    const liveActivity = await this.getLiveActivity(memberId, sessionId);

    if (!liveActivity) {
      this.logger.warn(
        `Live Activity not found for ending: memberId=${memberId}, sessionId=${sessionId}`,
      );
      return;
    }

    await this.liveActivityPush.sendLiveActivityEnd(
      liveActivity.apnsToken,
      liveActivity.topic,
      Math.floor(Date.now() / 1000),
    );
    await this.liveActivityState.remove(memberId, sessionId);

    this.logger.log(
      `Live Activity ended: memberId=${memberId}, sessionId=${sessionId}`,
    );
  }

  async getActiveLiveActivities(
    memberId: number,
  ): Promise<Array<number | string>> {
    return this.liveActivityState.getMemberSessionIds(memberId);
  }

  async extendSessionLiveActivities(
    payload: SessionExtendEvent,
  ): Promise<void> {
    const {
      sessionId,
      remainingMsUntilPreviousEnd,
      title,
      startTimeMs,
      endTimeMs,
    } = payload;
    if (sessionId == null || remainingMsUntilPreviousEnd == null) {
      this.logger.warn(
        'extend-session: sessionId 또는 endTime 없음 — 이벤트 페이로드 확인',
      );
      return;
    }

    const memberIds =
      await this.liveActivityState.getSessionMemberIds(sessionId);
    const timerEndMs =
      endTimeMs != null && !Number.isNaN(endTimeMs)
        ? endTimeMs
        : remainingMsUntilPreviousEnd;
    const timerStartMs =
      startTimeMs != null && !Number.isNaN(startTimeMs)
        ? startTimeMs
        : undefined;

    if (timerStartMs == null) {
      this.logger.warn(
        'extend-session: timerStartDateInMilliseconds 없음 — 구버전 emit 또는 날짜 파싱 실패 가능',
      );
    }

    for (const memberId of memberIds) {
      await this.updateLiveActivity(memberId, {
        sessionId,
        event: 'update',
        contentState: {
          title: '연습실 사용중',
          subtitle: title ?? '',
          ...(timerStartMs != null
            ? { timerStartDateInMilliseconds: timerStartMs }
            : {}),
          timerEndDateInMilliseconds: timerEndMs,
          imageName: 'music_note',
          dynamicIslandImageName: 'music_note_small',
        },
      });
    }
    this.logger.log('extendSessionLiveActivities');
  }

  async endSessionLiveActivities(sessionId: number | string): Promise<void> {
    if (sessionId == null) {
      this.logger.warn('end-session: sessionId 없음 — 이벤트 페이로드 확인');
      return;
    }

    try {
      const liveActivities =
        await this.liveActivityState.findAllBySession(sessionId);

      for (const liveActivity of liveActivities) {
        try {
          await this.liveActivityPush.sendLiveActivityEnd(
            liveActivity.apnsToken,
            liveActivity.topic,
            Math.floor(Date.now() / 1000),
          );
          this.logger.log(
            `Live Activity ended for member ${liveActivity.memberId}, session ${sessionId}`,
          );
        } catch (error) {
          this.logger.error(
            `Error ending Live Activity for memberId ${liveActivity.memberId}: ${error.message}`,
            error.stack,
          );
        }
      }

      await this.liveActivityState.clearSession(sessionId);

      this.logger.log(
        `Ended ${liveActivities.length} Live Activities for session: ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error ending session Live Activities: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAllLiveActivitiesForSession(
    sessionId: number | string,
  ): Promise<LiveActivityInfo[]> {
    try {
      return await this.liveActivityState.findAllBySession(sessionId);
    } catch (error) {
      this.logger.error(
        `Error getting Live Activities for session: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }
}
