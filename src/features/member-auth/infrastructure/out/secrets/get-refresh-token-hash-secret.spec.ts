import { afterEach, describe, expect, it } from '@jest/globals';
import { getRefreshTokenHashSecret } from './get-refresh-token-hash-secret';

describe('getRefreshTokenHashSecret', () => {
  const originalSecret = process.env.REFRESH_TOKEN_HASH_SECRET;

  afterEach(() => {
    process.env.REFRESH_TOKEN_HASH_SECRET = originalSecret;
  });

  it('REFRESH_TOKEN_HASH_SECRET이 없으면 에러를 던진다', () => {
    delete process.env.REFRESH_TOKEN_HASH_SECRET;
    expect(() => getRefreshTokenHashSecret()).toThrow(
      'REFRESH_TOKEN_HASH_SECRET must be set',
    );
  });

  it('설정되어 있으면 문자열을 반환한다', () => {
    process.env.REFRESH_TOKEN_HASH_SECRET = 'ok';
    expect(getRefreshTokenHashSecret()).toBe('ok');
  });
});
