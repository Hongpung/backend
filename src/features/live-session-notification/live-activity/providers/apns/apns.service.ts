import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mutex } from 'async-mutex';
import * as apn from 'node-apn';
import * as path from 'path';
import * as fs from 'fs';
import {
  APNSMessage,
  APNSLiveActivityMessage,
} from './interfaces/apns-message.interface';
import { ILiveActivityPushPort } from '../../application/ports/out/live-activity-push.port';

@Injectable()
export class ApnsService implements ILiveActivityPushPort, OnModuleDestroy {
  private static readonly MAX_RECIPIENTS_PER_SEND = 10;
  private static readonly LIVE_ACTIVITY_TOPIC_SUFFIX =
    '.push-type.liveactivity';

  private readonly logger = new Logger(ApnsService.name);
  private readonly sendMutex = new Mutex();
  private provider: apn.Provider;
  private isProviderShutdown = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeAPNs();
  }

  private initializeAPNs() {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    const keyPath = this.configService.get<string>('APNS_KEY_PATH')?.trim();
    const keyId = this.configService.get<string>('APNS_KEY_ID') || '';
    const teamId = this.configService.get<string>('APNS_TEAM_ID') || '';

    const resolvePath = (filePath?: string): string => {
      if (!filePath) return '';
      if (path.isAbsolute(filePath)) {
        return filePath;
      }
      return path.resolve(process.cwd(), filePath);
    };

    const resolvedKeyPath = resolvePath(keyPath);

    if (isProduction && !resolvedKeyPath) {
      throw new Error(
        'APNS_KEY_PATH is required in production environment (fail-fast)',
      );
    }

    if (resolvedKeyPath && !fs.existsSync(resolvedKeyPath)) {
      if (isProduction) {
        throw new Error(
          `APNs key file not found in production: ${resolvedKeyPath} (fail-fast)`,
        );
      }
      this.logger.warn(`APNs key file not found: ${resolvedKeyPath}`);
    }

    const options: apn.ProviderOptions = {
      token: {
        key: resolvedKeyPath || '',
        keyId: keyId || '',
        teamId: teamId,
      },
      production: isProduction,
    };

    this.provider = new apn.Provider(options);
    this.logger.log(`APNs Provider initialized (production: ${isProduction})`);
    if (resolvedKeyPath) {
      this.logger.log(`APNs key path: ${resolvedKeyPath}`);
    }
  }

  async sendNotification(message: APNSMessage): Promise<apn.Responses> {
    try {
      const notification = new apn.Notification();

      notification.topic = message.topic;
      notification.priority = message.priority || 10;

      if (message.alert) {
        if (message.alert.title && message.alert.body) {
          notification.alert = {
            title: message.alert.title,
            body: message.alert.body,
          };
        } else {
          notification.alert = message.alert.title || message.alert.body || '';
        }
      }

      if (message.sound) {
        notification.sound = message.sound;
      }
      if (message.badge !== undefined) {
        notification.badge = message.badge;
      }

      if (message.data) {
        notification.payload = message.data;
      }

      const result = await this.sendWithBackpressure(
        notification,
        message.deviceToken,
      );

      if (result.failed.length > 0) {
        result.failed.forEach((failure) => {
          if (failure.error) {
            this.logger.error(`APNs transport error: ${failure.error.message}`);
          } else {
            this.logger.error(
              `APNs error: status=${failure.status}, response=${JSON.stringify(failure.response)}`,
            );
          }
        });
      }

      if (result.sent.length > 0) {
        this.logger.log(
          `APNs notification sent successfully to ${result.sent.length} device(s)`,
        );
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error sending APNs notification: ${error.message}`,
          error.stack,
        );
      }
      throw error;
    }
  }

  async sendToMultipleDevices(
    deviceTokens: string[],
    title: string,
    body: string,
    topic: string,
    data?: Record<string, any>,
  ): Promise<apn.Responses> {
    try {
      if (deviceTokens.length === 0) {
        return { sent: [], failed: [] };
      }

      const notification = new apn.Notification();

      notification.topic = topic;
      notification.alert = { title, body };
      notification.sound = 'default';
      notification.priority = 10;

      if (data) {
        notification.payload = data;
      }

      const result: apn.Responses = { sent: [], failed: [] };
      for (
        let index = 0;
        index < deviceTokens.length;
        index += ApnsService.MAX_RECIPIENTS_PER_SEND
      ) {
        const batch = deviceTokens.slice(
          index,
          index + ApnsService.MAX_RECIPIENTS_PER_SEND,
        );
        const batchResult = await this.sendWithBackpressure(
          notification,
          batch,
        );
        result.sent.push(...batchResult.sent);
        result.failed.push(...batchResult.failed);
      }

      if (result.failed.length > 0) {
        this.logger.warn(
          `APNs failed to send to ${result.failed.length} device(s)`,
        );
      }
      if (result.sent.length > 0) {
        this.logger.log(`APNs sent to ${result.sent.length} device(s)`);
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error sending APNs batch notifications: ${error.message}`,
          error.stack,
        );
      }
      throw error;
    }
  }

  async sendLiveActivityUpdate(
    message: APNSLiveActivityMessage,
  ): Promise<apn.Responses> {
    try {
      const notification = new apn.Notification();

      notification.pushType = 'liveactivity';
      notification.topic = this.toLiveActivityTopic(message.topic);
      notification.priority = message.priority ?? 10;
      const timestampSeconds = Math.floor(
        (message.timestamp ?? Date.now()) / 1000,
      );

      notification.rawPayload = {
        aps: {
          event: message.event,
          'content-state': message.contentState,
          timestamp: timestampSeconds,
        },
      };

      notification.expiry = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

      const result = await this.sendWithBackpressure(
        notification,
        message.deviceToken,
      );

      if (result.failed.length > 0) {
        result.failed.forEach((failure) => {
          if (failure.error) {
            this.logger.error(
              `APNs Live Activity transport error: ${failure.error.message}`,
            );
          } else {
            this.logger.error(
              `APNs Live Activity error: status=${failure.status}, response=${JSON.stringify(failure.response)}`,
            );
            const failedDevice = failure.device || message.deviceToken;
            this.logger.error(
              `APNs Live Activity failed device token=${this.maskDeviceToken(failedDevice)}`,
            );
          }
        });
      }

      if (result.sent.length > 0) {
        this.logger.log(
          `APNs Live Activity ${message.event} sent successfully to ${result.sent.length} device(s)`,
        );
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error sending APNs Live Activity: ${error.message}`,
          error.stack,
        );
      }
      throw error;
    }
  }

  async sendLiveActivityEnd(
    deviceToken: string,
    topic: string,
    dismissalDate?: number,
  ): Promise<apn.Responses> {
    try {
      const timestampSeconds = Math.floor(Date.now() / 1000);
      const notification = new apn.Notification();
      notification.pushType = 'liveactivity';
      notification.topic = this.toLiveActivityTopic(topic);
      notification.priority = 10;
      notification.rawPayload = {
        aps: {
          event: 'end',
          'content-state': {},
          timestamp: timestampSeconds,
          'dismissal-date': dismissalDate ?? timestampSeconds,
        },
      };

      const result = await this.sendWithBackpressure(notification, deviceToken);

      if (result.failed.length > 0) {
        this.logger.error('APNs Live Activity end failed');
      } else {
        this.logger.log('APNs Live Activity ended successfully');
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error ending APNs Live Activity: ${error.message}`,
          error.stack,
        );
      }
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    await this.sendMutex.runExclusive(async () => {
      if (this.isProviderShutdown) {
        return;
      }
      this.isProviderShutdown = true;
      this.provider.shutdown();
      this.logger.log('APNs Provider shutdown');
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  private async sendWithBackpressure(
    notification: apn.Notification,
    recipients: string | string[],
  ): Promise<apn.Responses> {
    return this.sendMutex.runExclusive(() => {
      if (this.isProviderShutdown) {
        throw new Error('APNs Provider is already shutdown');
      }
      return this.provider.send(notification, recipients);
    });
  }

  private toLiveActivityTopic(topic: string): string {
    if (topic.endsWith(ApnsService.LIVE_ACTIVITY_TOPIC_SUFFIX)) {
      return topic;
    }
    return `${topic}${ApnsService.LIVE_ACTIVITY_TOPIC_SUFFIX}`;
  }

  private maskDeviceToken(token: string): string {
    if (!token) {
      return '';
    }
    if (token.length <= 8) {
      return '***';
    }
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
  }
}
