import type { LiveActivityInfo } from '../../live-activity.model';

export const LiveActivityStatePort = Symbol('LiveActivityStatePort');

export interface ILiveActivityStatePort {
  register(info: LiveActivityInfo): Promise<void>;
  find(
    memberId: number,
    sessionId: number | string,
  ): Promise<LiveActivityInfo | null>;
  save(info: LiveActivityInfo): Promise<void>;
  remove(memberId: number, sessionId: number | string): Promise<void>;
  getMemberSessionIds(memberId: number): Promise<Array<number | string>>;
  getSessionMemberIds(sessionId: number | string): Promise<number[]>;
  findAllBySession(sessionId: number | string): Promise<LiveActivityInfo[]>;
  clearSession(sessionId: number | string): Promise<void>;
}
