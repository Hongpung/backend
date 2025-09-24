export const LiveNotificationPushPort = Symbol('LiveNotificationPushPort');

export interface ILiveNotificationPushPort {
  sendLiveNotification(
    tokens: string[],
    data: Record<string, any>,
    priority?: 'default' | 'normal' | 'high',
  ): Promise<unknown>;
}
