import { UserNotificationTokenEntity } from '../../../domain/user-notification-token.entity';

export const NotificationTokenRepositoryPort = Symbol(
  'NotificationTokenRepositoryPort',
);

export interface SavePushTokenCommand {
  notificationToken: string;
  pushEnable: boolean;
}

export interface INotificationTokenRepository {
  findAllNotificationTokens(): Promise<UserNotificationTokenEntity[]>;

  findOneNotificationToken(
    memberId: number,
  ): Promise<UserNotificationTokenEntity | null>;

  /** memberIds에 대한 push delivery target만 조회 (표시 정보 제외) */
  findPushTargetsByMemberIds(
    memberIds: number[],
  ): Promise<UserNotificationTokenEntity[]>;

  saveToken(memberId: number, command: SavePushTokenCommand): Promise<void>;

  removeToken(memberId: number): Promise<void>;

  updatePushEnable(entity: UserNotificationTokenEntity): Promise<void>;
}
