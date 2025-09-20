import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import {
  IPushDeliveryPort,
  PushNotificationMessage,
} from '../../../application/ports/out/push-delivery.port';

@Injectable()
export class ExpoPushDeliveryAdapter implements IPushDeliveryPort {
  private readonly expo = new Expo();
  private readonly logger = new Logger(ExpoPushDeliveryAdapter.name);

  isValidPushToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }

  async send(messages: PushNotificationMessage[]): Promise<void> {
    if (messages.length === 0) {
      return;
    }

    const expoMessages: ExpoPushMessage[] = messages.map((message) => ({
      ...message,
      sound: 'default',
    }));
    const chunks = this.expo.chunkPushNotifications(expoMessages);
    const tickets: ExpoPushTicket[] = [];

    try {
      for (const chunk of chunks) {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }
      this.logger.log(`Push notification tickets: ${JSON.stringify(tickets)}`);
    } catch (error) {
      this.logger.error('Error sending push notifications', error);
    }
  }
}
