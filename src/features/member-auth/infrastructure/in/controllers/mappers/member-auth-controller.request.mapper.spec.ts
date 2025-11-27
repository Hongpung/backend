import { describe, expect, it } from '@jest/globals';
import type { Request } from 'express';
import { MemberAuthControllerRequestMapper } from './member-auth-controller.request.mapper';

describe('MemberAuthControllerRequestMapper', () => {
  it('toCheckEmail은 email만 반환한다', () => {
    expect(
      MemberAuthControllerRequestMapper.toCheckEmail({
        email: 'user@test.com',
      } as never),
    ).toBe('user@test.com');
  });

  it('toSignupParams는 optional 필드를 null로 정규화한다', () => {
    expect(
      MemberAuthControllerRequestMapper.toSignupParams({
        email: 'a@test.com',
        password: 'pw',
        name: '홍길동',
        enrollmentNumber: '20240001',
      } as never),
    ).toEqual({
      email: 'a@test.com',
      password: 'pw',
      name: '홍길동',
      enrollmentNumber: '20240001',
      clubId: null,
      nickname: null,
    });
  });

  it('toLoginParams는 user-agent와 deviceName null을 반영한다', () => {
    const req = {
      headers: { 'user-agent': 'JestAgent/1.0' },
      ip: '127.0.0.1',
    } as Request;

    expect(
      MemberAuthControllerRequestMapper.toLoginParams(
        {
          email: 'a@test.com',
          password: 'pw',
          deviceId: '550e8400-e29b-41d4-a716-446655440000',
          rememberMe: true,
          autoLogin: false,
        } as never,
        req,
      ),
    ).toEqual({
      email: 'a@test.com',
      password: 'pw',
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
      deviceName: null,
      rememberMe: true,
      autoLogin: false,
      userAgent: 'JestAgent/1.0',
      ipAddress: '127.0.0.1',
    });
  });

  it('toLogoutParams는 dto 없을 때 sessionId만 전달한다', () => {
    expect(
      MemberAuthControllerRequestMapper.toLogoutParams(undefined, 'sess-1'),
    ).toEqual({
      refreshToken: undefined,
      sessionId: 'sess-1',
      deviceId: undefined,
      clearPushTokens: undefined,
    });
  });
});
