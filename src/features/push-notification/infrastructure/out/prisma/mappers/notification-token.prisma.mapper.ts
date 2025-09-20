import { UserNotificationTokenEntity } from '../../../../domain/user-notification-token.entity';

export class NotificationTokenPrismaMapper {
  static fromPrismaMember(data: {
    memberId: number;
    notificationToken: string | null;
    pushEnable: boolean;
  }): UserNotificationTokenEntity {
    return new UserNotificationTokenEntity(
      data.memberId,
      data.notificationToken,
      data.pushEnable,
    );
  }

  static toPrismaData(entity: UserNotificationTokenEntity): {
    notificationToken: string | null;
    pushEnable: boolean;
  } {
    return {
      notificationToken: entity.notificationToken,
      pushEnable: entity.pushEnable,
    };
  }
}
