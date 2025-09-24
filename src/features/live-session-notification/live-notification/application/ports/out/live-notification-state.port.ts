import type { LiveNotificationInfo } from '../../live-notification.model';

export const LiveNotificationStatePort = Symbol('LiveNotificationStatePort');

export interface ILiveNotificationStatePort {
  register(info: LiveNotificationInfo): Promise<void>;
  find(
    memberId: number,
    sessionId: number | string,
  ): Promise<LiveNotificationInfo | null>;
  save(info: LiveNotificationInfo): Promise<void>;
  remove(memberId: number, sessionId: number | string): Promise<void>;
  getSessionMemberIds(sessionId: number | string): Promise<number[]>;
  findAllBySession(sessionId: number | string): Promise<LiveNotificationInfo[]>;
  clearSession(sessionId: number | string): Promise<void>;
}
