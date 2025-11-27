import { describe, expect, it } from '@jest/globals';
import { MemberAuthVerificationControllerRequestMapper } from './member-auth-verification-controller.request.mapper';

describe('MemberAuthVerificationControllerRequestMapper', () => {
  it('toEmail은 email만 반환한다', () => {
    expect(
      MemberAuthVerificationControllerRequestMapper.toEmail({
        email: 'verify@test.com',
      } as never),
    ).toBe('verify@test.com');
  });

  it('toVerifyCodeParams는 email과 code를 반환한다', () => {
    expect(
      MemberAuthVerificationControllerRequestMapper.toVerifyCodeParams({
        email: 'verify@test.com',
        code: '123456',
      } as never),
    ).toEqual({ email: 'verify@test.com', code: '123456' });
  });
});
