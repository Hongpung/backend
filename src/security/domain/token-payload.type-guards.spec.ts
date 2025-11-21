import { describe, expect, it } from '@jest/globals';
import { isMemberTokenPayload } from './token-payload.type-guards';

describe('isMemberTokenPayload', () => {
  it('sid가 문자열이면 통과한다', () => {
    expect(
      isMemberTokenPayload({
        memberId: 1,
        email: 'a@b.com',
        clubId: 0,
        sid: 'uuid',
      }),
    ).toBe(true);
  });

  it('sid가 비문자열이면 실패한다', () => {
    expect(
      isMemberTokenPayload({
        memberId: 1,
        email: 'a@b.com',
        clubId: 0,
        sid: 123 as unknown as string,
      }),
    ).toBe(false);
  });

  it('sid가 빈 문자열이면 실패한다', () => {
    expect(
      isMemberTokenPayload({
        memberId: 1,
        email: 'a@b.com',
        clubId: 0,
        sid: '   ',
      }),
    ).toBe(false);
  });
});
