import { Injectable } from '@nestjs/common';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import {
  INotificationRepository,
  NotificationData,
} from '../../../application/ports/out/notification.repository.port';
import { NotificationPrismaMapper } from './mappers/notification.prisma.mapper';
import { NotificationEntity } from '../../../domain/notification.entity';

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(
    data: NotificationData,
  ): Promise<NotificationEntity> {
    const notification = await this.prisma.notification.create({
      data: {
        memberId: data.memberId,
        timestamp: AppKstDateTime.getNowKoreanTime(),
        data: JSON.stringify({
          title: data.title,
          body: data.body,
          data: data.data,
        }),
      },
    });

    return NotificationPrismaMapper.fromPrisma(notification);
  }

  async findNotificationsByMemberId(
    memberId: number,
  ): Promise<NotificationEntity[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { memberId },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return notifications.map((notification) =>
      NotificationPrismaMapper.fromPrisma(notification),
    );
  }

  async findUnreadNotification(
    memberId: number,
  ): Promise<NotificationEntity | null> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        memberId,
        isRead: false,
      },
    });

    if (!notification) return null;

    return NotificationPrismaMapper.fromPrisma(notification);
  }

  async markAllAsRead(memberId: number): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        memberId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return { count: result.count };
  }

  async deleteNotification(
    notificationId: number,
    memberId: number,
  ): Promise<void> {
    await this.prisma.notification.delete({
      where: {
        notificationId,
        memberId,
      },
    });
  }

  async deleteAllNotifications(memberId: number): Promise<{ count: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        memberId,
      },
    });

    return { count: result.count };
  }

  async deleteReadNotificationsOlderThan(
    cutoff: Date,
  ): Promise<{ count: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        isRead: true,
        timestamp: {
          lt: cutoff,
        },
      },
    });

    return { count: result.count };
  }
}
