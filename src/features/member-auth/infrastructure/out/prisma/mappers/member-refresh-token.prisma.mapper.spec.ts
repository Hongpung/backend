import { describe, expect, it } from '@jest/globals';
import { MemberRefreshTokenEntity } from '../../../../domain/member-refresh-token.entity';
import { MemberRefreshTokenPrismaMapper } from './member-refresh-token.prisma.mapper';

describe('MemberRefreshTokenPrismaMapper', () => {
  const row = {
    id: 7,
    memberId: 3,
    sessionId: 'sess-abc',
    deviceId: '550e8400-e29b-41d4-a716-446655440000',
    rememberMe: true,
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    revokedAt: null as Date | null,
  };

  it('toDomain은 MemberRefreshTokenEntity로 변환한다', () => {
    const entity = MemberRefreshTokenPrismaMapper.toDomain(row);
    expect(entity).toBeInstanceOf(MemberRefreshTokenEntity);
    expect(entity.id).toBe(7);
    expect(entity.memberId).toBe(3);
    expect(entity.sessionId).toBe('sess-abc');
    expect(entity.deviceId).toBe(row.deviceId);
    expect(entity.rememberMe).toBe(true);
    expect(entity.expiresAt).toEqual(row.expiresAt);
    expect(entity.revokedAt).toBeNull();
  });

  it('toDomainOrNull은 null 입력 시 null을 반환한다', () => {
    expect(MemberRefreshTokenPrismaMapper.toDomainOrNull(null)).toBeNull();
  });

  it('toDomainOrNull은 데이터가 있으면 toDomain과 동일한 결과를 반환한다', () => {
    const entity = MemberRefreshTokenPrismaMapper.toDomainOrNull(row);
    expect(entity).toBeInstanceOf(MemberRefreshTokenEntity);
    expect(entity).toEqual(MemberRefreshTokenPrismaMapper.toDomain(row));
  });
});
