import { describe, expect, it } from '@jest/globals';
import { MemberRefreshTokenEntity } from './member-refresh-token.entity';

describe('MemberRefreshTokenEntity', () => {
  const deviceId = '550e8400-e29b-41d4-a716-446655440000';
  const base = {
    id: 1,
    memberId: 10,
    sessionId: 'sess-1',
    deviceId,
    rememberMe: false,
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    revokedAt: null as Date | null,
  };

  it('matchesDevice는 deviceId가 같을 때 true이다', () => {
    const entity = new MemberRefreshTokenEntity(
      base.id,
      base.memberId,
      base.sessionId,
      base.deviceId,
      base.rememberMe,
      base.expiresAt,
      base.revokedAt,
    );
    expect(entity.matchesDevice(deviceId)).toBe(true);
    expect(entity.matchesDevice('other-device')).toBe(false);
  });

  it('isRevoked는 revokedAt이 있을 때 true이다', () => {
    const active = new MemberRefreshTokenEntity(
      base.id,
      base.memberId,
      base.sessionId,
      base.deviceId,
      base.rememberMe,
      base.expiresAt,
      null,
    );
    const revoked = new MemberRefreshTokenEntity(
      base.id,
      base.memberId,
      base.sessionId,
      base.deviceId,
      base.rememberMe,
      base.expiresAt,
      new Date(),
    );
    expect(active.isRevoked()).toBe(false);
    expect(revoked.isRevoked()).toBe(true);
  });

  it('isExpired는 expiresAt이 now 이하일 때 true이다', () => {
    const future = new MemberRefreshTokenEntity(
      base.id,
      base.memberId,
      base.sessionId,
      base.deviceId,
      base.rememberMe,
      new Date('2030-01-01T00:00:00.000Z'),
      null,
    );
    const now = new Date('2025-06-01T12:00:00.000Z');
    const expired = new MemberRefreshTokenEntity(
      base.id,
      base.memberId,
      base.sessionId,
      base.deviceId,
      base.rememberMe,
      new Date('2025-06-01T12:00:00.000Z'),
      null,
    );

    expect(future.isExpired(now)).toBe(false);
    expect(expired.isExpired(now)).toBe(true);
  });

  it('belongsToMember는 memberId가 같을 때 true이다', () => {
    const entity = new MemberRefreshTokenEntity(
      base.id,
      base.memberId,
      base.sessionId,
      base.deviceId,
      base.rememberMe,
      base.expiresAt,
      base.revokedAt,
    );
    expect(entity.belongsToMember(10)).toBe(true);
    expect(entity.belongsToMember(99)).toBe(false);
  });
});
