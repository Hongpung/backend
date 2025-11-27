import { describe, expect, it } from '@jest/globals';
import { AdminAuthControllerResponseMapper } from './admin-auth-controller.response.mapper';

describe('AdminAuthControllerResponseMapper', () => {
  it('toTokenResDto는 token을 그대로 전달한다', () => {
    expect(
      AdminAuthControllerResponseMapper.toTokenResDto({
        token: 'jwt-token',
      }),
    ).toEqual({ token: 'jwt-token' });
  });
});
