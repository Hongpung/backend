import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER, RedisCache } from '@hongpung/redis';
import type { LiveNotificationInfo } from '../../../application/live-notification.model';
import { ILiveNotificationStatePort } from '../../../application/ports/out/live-notification-state.port';

/**
 * Live Notification 등록 상태 Redis 저장소.
 *
 * Degrade: adapter는 Redis 오류를 swallow하지 않는다. 읽기 degrade는
 * `LiveNotificationService.getAllLiveNotificationsForSession`에서만 수행(빈 배열).
 * 쓰기·멤버 목록 조회 실패는 상위로 전파된다. 상세는 docs/DEPLOYMENT_MIGRATION.md LSN3.
 */
@Injectable()
export class RedisLiveNotificationStateAdapter
  implements ILiveNotificationStatePort
{
  private readonly redisKeyPrefix = 'live-notification';
  private readonly ttlMilliseconds = 24 * 60 * 60 * 1000;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: RedisCache,
  ) {}

  async register(info: LiveNotificationInfo): Promise<void> {
    await this.save(info);
    await this.addSessionMember(info.sessionId, info.memberId);
  }

  async find(
    memberId: number,
    sessionId: number | string,
  ): Promise<LiveNotificationInfo | null> {
    return (
      (await this.cacheManager.get<LiveNotificationInfo>(
        this.getLiveNotificationKey(memberId, sessionId),
      )) || null
    );
  }

  async save(info: LiveNotificationInfo): Promise<void> {
    await this.cacheManager.set(
      this.getLiveNotificationKey(info.memberId, info.sessionId),
      info,
      this.ttlMilliseconds,
    );
  }

  async remove(memberId: number, sessionId: number | string): Promise<void> {
    await this.cacheManager.del(
      this.getLiveNotificationKey(memberId, sessionId),
    );
    await this.removeSessionMember(sessionId, memberId);
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
  ): Promise<LiveNotificationInfo[]> {
    const memberIds = await this.getSessionMemberIds(sessionId);
    const liveNotifications: LiveNotificationInfo[] = [];

    for (const memberId of memberIds) {
      const liveNotification = await this.find(memberId, sessionId);
      if (liveNotification) {
        liveNotifications.push(liveNotification);
      }
    }

    return liveNotifications;
  }

  async clearSession(sessionId: number | string): Promise<void> {
    const memberIds = await this.getSessionMemberIds(sessionId);

    for (const memberId of memberIds) {
      await this.cacheManager.del(
        this.getLiveNotificationKey(memberId, sessionId),
      );
    }

    await this.cacheManager.del(this.getSessionMembersKey(sessionId));
  }

  private getLiveNotificationKey(
    memberId: number,
    sessionId: number | string,
  ): string {
    return `${this.redisKeyPrefix}:session:${sessionId}:member:${memberId}`;
  }

  private getSessionMembersKey(sessionId: number | string): string {
    return `${this.redisKeyPrefix}:session:${sessionId}:members`;
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
