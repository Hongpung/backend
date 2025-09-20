import { Notification } from '@prisma/client';
import { NotificationEntity } from '../../../../domain/notification.entity';

export class NotificationPrismaMapper {
  static fromPrisma(prismaData: Notification): NotificationEntity {
    return NotificationEntity.create({
      notificationId: prismaData.notificationId,
      memberId: prismaData.memberId,
      timestamp: prismaData.timestamp,
      isRead: prismaData.isRead,
      data:
        typeof prismaData.data === 'string'
          ? JSON.parse(prismaData.data)
          : prismaData.data,
    });
  }
}
