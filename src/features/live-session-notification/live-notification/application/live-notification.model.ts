/** Application-layer shapes — no HTTP / class-validator coupling */

export interface RegisterLiveNotificationInput {
  sessionId: string;
}

export interface SendLiveNotificationInput {
  sessionId: number | string;
  action: 'SESSION_EXTEND' | 'SESSION_END';
  endTime?: number;
}

export interface ExtendSessionLiveNotificationInput {
  sessionId: string | number;
  remainingMsUntilPreviousEnd: number;
  endTimeMs?: number;
}

export interface LiveNotificationInfo {
  memberId: number;
  sessionId: number | string;
  expoToken: string | null;
  registeredAt: number;
}
