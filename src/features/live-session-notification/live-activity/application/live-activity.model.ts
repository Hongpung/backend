/** Application-layer shapes — no HTTP / class-validator coupling */

export interface RegisterLiveActivityInput {
  sessionId: string;
  apnsToken: string;
}

export interface UpdateLiveActivityInput {
  sessionId: number | string;
  event?: 'update';
  contentState: Record<string, unknown>;
}

export interface LiveActivityInfo {
  memberId: number;
  sessionId: number | string;
  apnsToken: string;
  topic: string;
  registeredAt: number;
  lastUpdated: number;
}
