import { MemberRefreshTokenEntity } from '../../../domain/member-refresh-token.entity';

export const MemberAuthSessionRepositoryPort = Symbol(
  'MemberAuthSessionRepositoryPort',
);

export interface IMemberAuthSessionRepository {
  upsertDeviceOnLogin(params: {
    memberId: number;
    deviceId: string;
    deviceName?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<{ isNewDevice: boolean }>;

  createRefreshToken(params: {
    memberId: number;
    sessionId: string;
    deviceId: string;
    tokenHash: string;
    rememberMe: boolean;
    deviceName?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
    expiresAt: Date;
  }): Promise<{ id: number }>;

  findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<MemberRefreshTokenEntity | null>;

  rotateRefreshToken(params: {
    oldTokenId: number;
    memberId: number;
    sessionId: string;
    deviceId: string;
    rememberMe: boolean;
    deviceName?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
    newTokenHash: string;
    newExpiresAt: Date;
  }): Promise<{ newRefreshTokenId: number }>;

  revokeAllActiveTokensForSession(params: {
    memberId: number;
    sessionId: string;
  }): Promise<void>;

  revokeAllActiveTokensForMemberDevice(params: {
    memberId: number;
    deviceId: string;
  }): Promise<void>;

  revokeAllActiveTokensForMember(memberId: number): Promise<void>;

  deleteStaleRefreshTokensOlderThan(cutoffDate: Date): Promise<number>;
}
