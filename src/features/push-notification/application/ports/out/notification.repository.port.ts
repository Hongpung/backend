import { NotificationEntity } from '../../../domain/notification.entity';

export const NotificationRepositoryPort = Symbol('NotificationRepositoryPort');

export interface NotificationData {
  memberId: number;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface INotificationRepository {
  createNotification(data: NotificationData): Promise<NotificationEntity>;

  findNotificationsByMemberId(memberId: number): Promise<NotificationEntity[]>;

  findUnreadNotification(memberId: number): Promise<NotificationEntity | null>;

  markAllAsRead(memberId: number): Promise<{ count: number }>;

  deleteNotification(notificationId: number, memberId: number): Promise<void>;

  deleteAllNotifications(memberId: number): Promise<{ count: number }>;

  /** 전역: cutoff 이전에 생성된 읽음 알림 일괄 삭제 */
  deleteReadNotificationsOlderThan(cutoff: Date): Promise<{ count: number }>;
}
