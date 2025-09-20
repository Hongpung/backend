import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  INotificationRepository,
  NotificationRepositoryPort,
} from './ports/out/notification.repository.port';
import {
  INotificationTokenRepository,
  NotificationTokenRepositoryPort,
} from './ports/out/notification-token.repository.port';
import {
  IPushDeliveryPort,
  PushDeliveryPort,
  PushNotificationMessage,
} from './ports/out/push-delivery.port';
import { UserNotificationTokenEntity } from '../domain/user-notification-token.entity';
import type { NotificationUseCasePort } from './ports/in/notification.use-case.port';

@Injectable()
export class NotificationService implements NotificationUseCasePort {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(NotificationRepositoryPort)
    private readonly repository: INotificationRepository,
    @Inject(NotificationTokenRepositoryPort)
    private readonly tokenRepository: INotificationTokenRepository,
    @Inject(PushDeliveryPort)
    private readonly pushDelivery: IPushDeliveryPort,
  ) {}

  async sendPushNotifications({
    to,
    title,
    body,
    data,
  }: {
    to: number[];
    title: string;
    body: string;
    data?: Record<string, any>;
  }): Promise<void> {
    const targets = await this.tokenRepository.findPushTargetsByMemberIds(to);
    const messages: PushNotificationMessage[] = [];

    for (const tokenEntity of targets) {
      const message = await this.processNotificationToken(
        tokenEntity.memberId,
        tokenEntity,
        { title, body, data },
      );
      if (message) {
        messages.push(message);
      }
    }

    await this.pushDelivery.send(messages);
  }

  async sendAllPushNotifications({
    title,
    body,
    data,
  }: {
    title: string;
    body: string;
    data?: Record<string, any>;
  }): Promise<void> {
    const memberTokens = await this.tokenRepository.findAllNotificationTokens();
    const messages: PushNotificationMessage[] = [];

    for (const tokenEntity of memberTokens) {
      const message = await this.processNotificationToken(
        tokenEntity.memberId,
        tokenEntity,
        { title, body, data },
      );
      if (message) {
        messages.push(message);
      }
    }

    await this.pushDelivery.send(messages);
  }

  private async processNotificationToken(
    memberId: number,
    tokenEntity: UserNotificationTokenEntity,
    notificationData: {
      title: string;
      body: string;
      data?: Record<string, any>;
    },
  ): Promise<PushNotificationMessage | null> {
    const notificationEntity = await this.repository.createNotification({
      memberId,
      ...notificationData,
    });

    if (!tokenEntity.pushEnable) {
      return null;
    }

    if (
      !tokenEntity.notificationToken ||
      !this.pushDelivery.isValidPushToken(tokenEntity.notificationToken)
    ) {
      this.logger.warn(
        `Push token ${tokenEntity.notificationToken}는 유효하지 않은 Expo push token입니다.`,
      );
      return null;
    }

    return {
      to: tokenEntity.notificationToken,
      title: notificationEntity.data.title,
      body: notificationEntity.data.body,
      data: notificationEntity.data.data,
    };
  }

  async getUserNotifications(memberId: number) {
    const notifications =
      await this.repository.findNotificationsByMemberId(memberId);

    return notifications;
  }

  async userReadNotifications(memberId: number) {
    await this.repository.markAllAsRead(memberId);
    return { message: '모든 알림을 읽었어요.' };
  }

  async deleteNotification(notificationId: number, memberId: number) {
    await this.repository.deleteNotification(notificationId, memberId);
    return { message: '알림을 삭제했어요.' };
  }

  async deleteAllNotifications(memberId: number) {
    await this.repository.deleteAllNotifications(memberId);
    return { message: '모든 알림을 삭제했어요.' };
  }

  async getNotreadStatus(memberId: number) {
    const notReadNotificationEntity =
      await this.repository.findUnreadNotification(memberId);
    return { status: !!notReadNotificationEntity };
  }
}
