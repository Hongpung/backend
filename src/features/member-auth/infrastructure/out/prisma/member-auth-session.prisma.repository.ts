import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { IMemberAuthSessionRepository } from '../../../application/ports/out/member-auth-session.repository.port';
import { RefreshTokenRotationFailedError } from '../../../domain/member-refresh-token-rotation.error';
import { MemberRefreshTokenPrismaMapper } from './mappers/member-refresh-token.prisma.mapper';

@Injectable()
export class MemberAuthSessionPrismaRepository
  implements IMemberAuthSessionRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async upsertDeviceOnLogin(params: {
    memberId: number;
    deviceId: string;
    deviceName?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<{ isNewDevice: boolean }> {
    const existing = await this.prisma.memberDevice.findUnique({
      where: {
        memberId_deviceId: {
          memberId: params.memberId,
          deviceId: params.deviceId,
        },
      },
      select: { id: true },
    });

    const now = new Date();

    if (!existing) {
      await this.prisma.memberDevice.create({
        data: {
          memberId: params.memberId,
          deviceId: params.deviceId,
          deviceName: params.deviceName ?? undefined,
          userAgent: params.userAgent ?? undefined,
          ipAddress: params.ipAddress ?? undefined,
          lastLoginAt: now,
        },
      });
      return { isNewDevice: true };
    }

    await this.prisma.memberDevice.update({
      where: {
        memberId_deviceId: {
          memberId: params.memberId,
          deviceId: params.deviceId,
        },
      },
      data: {
        deviceName:
          params.deviceName !== undefined ? params.deviceName : undefined,
        userAgent:
          params.userAgent !== undefined ? params.userAgent : undefined,
        ipAddress:
          params.ipAddress !== undefined ? params.ipAddress : undefined,
        lastLoginAt: now,
      },
    });

    return { isNewDevice: false };
  }

  async createRefreshToken(params: {
    memberId: number;
    sessionId: string;
    deviceId: string;
    tokenHash: string;
    rememberMe: boolean;
    deviceName?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
    expiresAt: Date;
  }): Promise<{ id: number }> {
    const row = await this.prisma.memberRefreshToken.create({
      data: {
        memberId: params.memberId,
        sessionId: params.sessionId,
        deviceId: params.deviceId,
        tokenHash: params.tokenHash,
        rememberMe: params.rememberMe,
        deviceName: params.deviceName ?? undefined,
        userAgent: params.userAgent ?? undefined,
        ipAddress: params.ipAddress ?? undefined,
        expiresAt: params.expiresAt,
      },
      select: { id: true },
    });
    return { id: row.id };
  }

  async findRefreshTokenByHash(tokenHash: string) {
    const row = await this.prisma.memberRefreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        memberId: true,
        sessionId: true,
        deviceId: true,
        rememberMe: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
    return MemberRefreshTokenPrismaMapper.toDomainOrNull(row);
  }

  async rotateRefreshToken(params: {
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
  }): Promise<{ newRefreshTokenId: number }> {
    return this.prisma.$transaction(async (tx) => {
      const revokedAt = new Date();
      const revoked = await tx.memberRefreshToken.updateMany({
        where: {
          id: params.oldTokenId,
          memberId: params.memberId,
          sessionId: params.sessionId,
          deviceId: params.deviceId,
          revokedAt: null,
        },
        data: { revokedAt },
      });

      if (revoked.count !== 1) {
        throw new RefreshTokenRotationFailedError();
      }

      const created = await tx.memberRefreshToken.create({
        data: {
          memberId: params.memberId,
          sessionId: params.sessionId,
          deviceId: params.deviceId,
          tokenHash: params.newTokenHash,
          rememberMe: params.rememberMe,
          deviceName: params.deviceName ?? undefined,
          userAgent: params.userAgent ?? undefined,
          ipAddress: params.ipAddress ?? undefined,
          expiresAt: params.newExpiresAt,
        },
        select: { id: true },
      });

      await tx.memberRefreshToken.update({
        where: { id: params.oldTokenId },
        data: { replacedByTokenId: created.id },
      });

      return { newRefreshTokenId: created.id };
    });
  }

  async revokeAllActiveTokensForSession(params: {
    memberId: number;
    sessionId: string;
  }): Promise<void> {
    await this.prisma.memberRefreshToken.updateMany({
      where: {
        memberId: params.memberId,
        sessionId: params.sessionId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllActiveTokensForMemberDevice(params: {
    memberId: number;
    deviceId: string;
  }): Promise<void> {
    await this.prisma.memberRefreshToken.updateMany({
      where: {
        memberId: params.memberId,
        deviceId: params.deviceId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllActiveTokensForMember(memberId: number): Promise<void> {
    await this.prisma.memberRefreshToken.updateMany({
      where: {
        memberId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async deleteStaleRefreshTokensOlderThan(cutoffDate: Date): Promise<number> {
    const result = await this.prisma.memberRefreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: cutoffDate } },
          {
            AND: [
              { revokedAt: { not: null } },
              { revokedAt: { lt: cutoffDate } },
            ],
          },
        ],
      },
    });
    return result.count;
  }
}
