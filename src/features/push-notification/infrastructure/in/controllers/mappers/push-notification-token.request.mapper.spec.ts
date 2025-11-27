import { describe, expect, it } from '@jest/globals';
import { PushNotificationTokenRequestMapper } from './push-notification-token.request.mapper';

describe('PushNotificationTokenRequestMapper', () => {
  it('UpdateNotificationTokenReqDto를 UpdatePushNotificationTokenParams로 변환한다', () => {
    const params = PushNotificationTokenRequestMapper.toUpdateParams({
      notificationToken: 'ExponentPushToken[abc]',
      pushEnable: true,
    });

    expect(params).toEqual({
      notificationToken: 'ExponentPushToken[abc]',
      pushEnable: true,
    });
  });

  it('pushEnable이 생략된 DTO도 params에 undefined로 전달한다', () => {
    const params = PushNotificationTokenRequestMapper.toUpdateParams({
      notificationToken: 'ExponentPushToken[x]',
    });

    expect(params).toEqual({
      notificationToken: 'ExponentPushToken[x]',
      pushEnable: undefined,
    });
  });

  it('pushEnable만 전달된 DTO도 params로 변환한다', () => {
    const params = PushNotificationTokenRequestMapper.toUpdateParams({
      pushEnable: false,
    });

    expect(params).toEqual({
      notificationToken: undefined,
      pushEnable: false,
    });
  });
});
