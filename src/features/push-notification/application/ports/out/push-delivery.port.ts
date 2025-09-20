export const PushDeliveryPort = Symbol('PushDeliveryPort');

export interface PushNotificationMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface IPushDeliveryPort {
  isValidPushToken(token: string): boolean;
  send(messages: PushNotificationMessage[]): Promise<void>;
}
