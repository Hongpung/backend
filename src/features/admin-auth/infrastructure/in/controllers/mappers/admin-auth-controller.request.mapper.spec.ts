import { describe, expect, it } from '@jest/globals';
import { AdminAuthControllerRequestMapper } from './admin-auth-controller.request.mapper';

describe('AdminAuthControllerRequestMapper', () => {
  it('toLoginParams는 email과 password를 그대로 반환한다', () => {
    expect(
      AdminAuthControllerRequestMapper.toLoginParams({
        email: 'admin@test.com',
        password: 'secret',
      } as never),
    ).toEqual({
      email: 'admin@test.com',
      password: 'secret',
    });
  });
});
