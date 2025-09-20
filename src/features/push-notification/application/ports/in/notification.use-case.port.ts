import type { NotificationEntity } from '../../../domain/notification.entity';

export const NotificationUseCasePort = Symbol('NotificationUseCasePort');

export interface NotificationUseCasePort {
  sendPushNotifications(params: {
    to: number[];
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<void>;

  getUserNotifications(memberId: number): Promise<NotificationEntity[]>;

  userReadNotifications(memberId: number): Promise<{ message: string }>;

  deleteNotification(
    notificationId: number,
    memberId: number,
  ): Promise<{ message: string }>;

  deleteAllNotifications(memberId: number): Promise<{ message: string }>;

  getNotreadStatus(memberId: number): Promise<{ status: boolean }>;
}
