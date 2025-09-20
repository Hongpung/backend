import type { UpdatePushNotificationTokenParams } from '../../../../application/ports/in/push-notification-token.use-case.port';
import type { UpdateNotificationTokenReqDto } from '../../dto/request/update-notification-token.req.dto';

export class PushNotificationTokenRequestMapper {
  static toUpdateParams(
    dto: UpdateNotificationTokenReqDto,
  ): UpdatePushNotificationTokenParams {
    return {
      notificationToken: dto.notificationToken,
      pushEnable: dto.pushEnable,
    };
  }
}
