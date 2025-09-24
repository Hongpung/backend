import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { ILiveNotificationPushPort } from '../../application/ports/out/live-notification-push.port';

@Injectable()
export class ExpoService implements ILiveNotificationPushPort {
  private readonly logger = new Logger(ExpoService.name);
  private readonly expo: Expo;

  constructor() {
    this.expo = new Expo();
  }

  async sendLiveNotification(
    tokens: string[],
    data: Record<string, any>,
    priority: 'default' | 'normal' | 'high' = 'high',
  ): Promise<ExpoPushTicket[]> {
    const validTokens = tokens.filter((token) => {
      if (!Expo.isExpoPushToken(token)) {
        this.logger.warn(`Invalid Expo push token: ${token}`);
        return false;
      }
      return true;
    });

    if (validTokens.length === 0) {
      this.logger.warn('No valid Expo push tokens provided');
      return [];
    }

    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      data,
      priority,
      _contentAvailable: true,
    }));

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }

      const errors = tickets.filter((ticket) => ticket.status === 'error');
      if (errors.length > 0) {
        errors.forEach((error) => {
          this.logger.error(`Expo live notification error: ${error.message}`);
        });
      }

      this.logger.log(
        `Expo live notifications sent. Success: ${tickets.length - errors.length}, Failure: ${errors.length}`,
      );

      return tickets;
    } catch (error) {
      this.logger.error(
        `Error sending Expo live notifications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
