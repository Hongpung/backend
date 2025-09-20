import { Inject, Injectable } from '@nestjs/common';
import {
  ClearPushNotificationTokenPort,
  type IClearPushNotificationToken,
} from 'src/features/push-notification/application/ports/out/clear-push-notification-token.port';
import type { IMemberAuthClearPushToken } from '../../../application/ports/out/member-auth-clear-push-token.port';

@Injectable()
export class MemberAuthClearPushTokenAdapter
  implements IMemberAuthClearPushToken
{
  constructor(
    @Inject(ClearPushNotificationTokenPort)
    private readonly clearPushNotificationToken: IClearPushNotificationToken,
  ) {}

  clearPushToken(memberId: number): Promise<void> {
    return this.clearPushNotificationToken.clearPushToken(memberId);
  }
}
