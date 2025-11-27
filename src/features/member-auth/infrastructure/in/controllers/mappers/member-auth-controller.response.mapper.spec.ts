import { describe, expect, it } from '@jest/globals';
import { MemberAuthControllerResponseMapper } from './member-auth-controller.response.mapper';

describe('MemberAuthControllerResponseMapper', () => {
  it('toCheckEmailResDto는 isRegistered를 그대로 전달한다', () => {
    expect(
      MemberAuthControllerResponseMapper.toCheckEmailResDto({
        isRegistered: true,
      }),
    ).toEqual({ isRegistered: true });
  });

  it('toTokenResDto는 token 쌍을 매핑한다', () => {
    expect(
      MemberAuthControllerResponseMapper.toTokenResDto({
        token: 'access',
        refreshToken: 'refresh',
      }),
    ).toEqual({ token: 'access', refreshToken: 'refresh' });
  });

  it('toSignupListResDto는 SignupListItem 필드를 DTO로 변환한다', () => {
    expect(
      MemberAuthControllerResponseMapper.toSignupListResDto([
        {
          signupId: 1,
          name: '홍',
          nickname: null,
          club: '풍물',
          enrollmentNumber: '20240001',
          email: 'a@test.com',
        },
      ]),
    ).toEqual([
      {
        signupId: 1,
        name: '홍',
        nickname: null,
        club: '풍물',
        enrollmentNumber: '20240001',
        email: 'a@test.com',
      },
    ]);
  });
});
