import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Expo } from 'expo-server-sdk';
import {
  PushNotificationTokenUseCasePort,
  type UpdatePushNotificationTokenParams,
} from './ports/in/push-notification-token.use-case.port';
import {
  NotificationTokenRepositoryPort,
  type INotificationTokenRepository,
} from './ports/out/notification-token.repository.port';
import {
  PushNotificationMemberLookupPort,
  type IPushNotificationMemberLookup,
} from './ports/out/push-notification-member-lookup.port';
import type { IClearPushNotificationToken } from './ports/out/clear-push-notification-token.port';

@Injectable()
export class PushNotificationTokenService
  implements PushNotificationTokenUseCasePort, IClearPushNotificationToken
{
  constructor(
    @Inject(NotificationTokenRepositoryPort)
    private readonly tokenRepository: INotificationTokenRepository,
    @Inject(PushNotificationMemberLookupPort)
    private readonly memberLookup: IPushNotificationMemberLookup,
  ) {}

  async updatePushNotificationToken(
    memberId: number,
    params: UpdatePushNotificationTokenParams,
  ): Promise<{ message: string }> {
    const exists = await this.memberLookup.existsMember(memberId);
    if (!exists) {
      throw new NotFoundException(`MemberId: '${memberId}' is not exist`);
    }

    const { notificationToken, pushEnable } = params;

    if (!notificationToken?.trim()) {
      throw new BadRequestException('알림 토큰은 필수입니다.');
    }

    if (!Expo.isExpoPushToken(notificationToken)) {
      throw new BadRequestException('유효하지 않은 Expo 푸시 토큰 형식입니다.');
    }

    await this.tokenRepository.saveToken(memberId, {
      notificationToken: notificationToken.trim(),
      pushEnable: pushEnable ?? true,
    });

    return { message: '알림 토큰이 등록되었습니다.' };
  }

  async clearPushNotificationToken(
    memberId: number,
  ): Promise<{ message: string }> {
    await this.clearPushToken(memberId);
    return { message: '알림 토큰이 삭제되었습니다.' };
  }

  async clearPushToken(memberId: number): Promise<void> {
    const exists = await this.memberLookup.existsMember(memberId);
    if (!exists) {
      throw new NotFoundException(`MemberId: '${memberId}' is not exist`);
    }

    await this.tokenRepository.removeToken(memberId);
  }
}
