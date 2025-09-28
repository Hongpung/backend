import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER, RedisCache } from '@hongpung/redis';
import type { LiveActivityInfo } from '../../../application/live-activity.model';
import { ILiveActivityStatePort } from '../../../application/ports/out/live-activity-state.port';

/**
 * Live Activity 등록 상태 Redis 저장소.
 *
 * Degrade: adapter는 Redis 오류를 swallow하지 않는다. 읽기 degrade는
 * `LiveActivityService.getAllLiveActivitiesForSession`에서만 수행(빈 배열).
 * 쓰기·멤버 목록 조회 실패는 상위로 전파된다. 상세는 docs/DEPLOYMENT_MIGRATION.md LSN3.
 */
@Injectable()
export class RedisLiveActivityStateAdapter implements ILiveActivityStatePort {
  private readonly redisKeyPrefix = 'live-activity';
  private readonly ttlMilliseconds = 24 * 60 * 60 * 1000;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: RedisCache,
  ) {}

  async register(info: LiveActivityInfo): Promise<void> {
    await this.save(info);
    await this.addMemberSession(info.memberId, info.sessionId);
    await this.addSessionMember(info.sessionId, info.memberId);
  }

  async find(
    memberId: number,
    sessionId: number | string,
  ): Promise<LiveActivityInfo | null> {
    return (
      (await this.cacheManager.get<LiveActivityInfo>(
        this.getLiveActivityKey(memberId, sessionId),
      )) || null
    );
  }

  async save(info: LiveActivityInfo): Promise<void> {
    await this.cacheManager.set(
      this.getLiveActivityKey(info.memberId, info.sessionId),
      info,
      this.ttlMilliseconds,
    );
  }

  async remove(memberId: number, sessionId: number | string): Promise<void> {
    await this.cacheManager.del(this.getLiveActivityKey(memberId, sessionId));
    await this.removeMemberSession(memberId, sessionId);
    await this.removeSessionMember(sessionId, memberId);
  }

  async getMemberSessionIds(memberId: number): Promise<Array<number | string>> {
    return (
      (await this.cacheManager.get<Array<number | string>>(
        this.getMemberLiveActivitiesKey(memberId),
      )) || []
    );
  }

  async getSessionMemberIds(sessionId: number | string): Promise<number[]> {
    return (
      (await this.cacheManager.get<number[]>(
        this.getSessionMembersKey(sessionId),
      )) || []
    );
  }

  async findAllBySession(
    sessionId: number | string,
  ): Promise<LiveActivityInfo[]> {
    const memberIds = await this.getSessionMemberIds(sessionId);
    const liveActivities: LiveActivityInfo[] = [];

    for (const memberId of memberIds) {
      const liveActivity = await this.find(memberId, sessionId);
      if (liveActivity) {
        liveActivities.push(liveActivity);
      }
    }

    return liveActivities;
  }

  async clearSession(sessionId: number | string): Promise<void> {
    const liveActivities = await this.findAllBySession(sessionId);

    for (const liveActivity of liveActivities) {
      await this.removeMemberSession(liveActivity.memberId, sessionId);
      await this.cacheManager.del(
        this.getLiveActivityKey(liveActivity.memberId, sessionId),
      );
    }

    await this.cacheManager.del(this.getSessionMembersKey(sessionId));
  }

  private getLiveActivityKey(
    memberId: number,
    sessionId: number | string,
  ): string {
    return `${this.redisKeyPrefix}:session:${sessionId}:member:${memberId}`;
  }

  private getMemberLiveActivitiesKey(memberId: number): string {
    return `${this.redisKeyPrefix}:member:${memberId}`;
  }

  private getSessionMembersKey(sessionId: number | string): string {
    return `${this.redisKeyPrefix}:session:${sessionId}:members`;
  }

  private async addMemberSession(
    memberId: number,
    sessionId: number | string,
  ): Promise<void> {
    const memberKey = this.getMemberLiveActivitiesKey(memberId);
    const existingSessions =
      (await this.cacheManager.get<Array<number | string>>(memberKey)) || [];

    if (!existingSessions.includes(sessionId)) {
      await this.cacheManager.set(
        memberKey,
        [...existingSessions, sessionId],
        this.ttlMilliseconds,
      );
    }
  }

  private async addSessionMember(
    sessionId: number | string,
    memberId: number,
  ): Promise<void> {
    const sessionKey = this.getSessionMembersKey(sessionId);
    const existingMembers =
      (await this.cacheManager.get<number[]>(sessionKey)) || [];

    if (!existingMembers.includes(memberId)) {
      await this.cacheManager.set(
        sessionKey,
        [...existingMembers, memberId],
        this.ttlMilliseconds,
      );
    }
  }

  private async removeMemberSession(
    memberId: number,
    sessionId: number | string,
  ): Promise<void> {
    const memberKey = this.getMemberLiveActivitiesKey(memberId);
    const existingSessions =
      (await this.cacheManager.get<Array<number | string>>(memberKey)) || [];
    const updatedSessions = existingSessions.filter((id) => id !== sessionId);

    if (updatedSessions.length === 0) {
      await this.cacheManager.del(memberKey);
      return;
    }

    await this.cacheManager.set(
      memberKey,
      updatedSessions,
      this.ttlMilliseconds,
    );
  }

  private async removeSessionMember(
    sessionId: number | string,
    memberId: number,
  ): Promise<void> {
    const sessionKey = this.getSessionMembersKey(sessionId);
    const existingMembers =
      (await this.cacheManager.get<number[]>(sessionKey)) || [];
    const updatedMembers = existingMembers.filter((id) => id !== memberId);

    if (updatedMembers.length === 0) {
      await this.cacheManager.del(sessionKey);
      return;
    }

    await this.cacheManager.set(
      sessionKey,
      updatedMembers,
      this.ttlMilliseconds,
    );
  }
}
