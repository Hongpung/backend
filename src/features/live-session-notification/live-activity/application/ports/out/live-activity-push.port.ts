export const LiveActivityPushPort = Symbol('LiveActivityPushPort');

export interface LiveActivityUpdateMessage {
  deviceToken: string;
  topic: string;
  event: 'update';
  contentState: Record<string, unknown>;
  timestamp: number;
  priority?: 5 | 10;
}

export interface ILiveActivityPushPort {
  sendLiveActivityUpdate(message: LiveActivityUpdateMessage): Promise<unknown>;
  sendLiveActivityEnd(
    deviceToken: string,
    topic: string,
    dismissalDate?: number,
  ): Promise<unknown>;
}
