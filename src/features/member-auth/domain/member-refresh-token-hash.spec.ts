import { afterEach, describe, expect, it } from '@jest/globals';
import { hashRefreshToken } from './member-refresh-token-hash';

describe('member-refresh-token-hash (domain)', () => {
  it('hashRefreshToken은 동일 입력에 대해 결정적이다', () => {
    const secret = 'unit-secret';
    expect(hashRefreshToken('token-a', secret)).toBe(
      hashRefreshToken('token-a', secret),
    );
    expect(hashRefreshToken('token-a', secret)).not.toBe(
      hashRefreshToken('token-b', secret),
    );
  });
});
