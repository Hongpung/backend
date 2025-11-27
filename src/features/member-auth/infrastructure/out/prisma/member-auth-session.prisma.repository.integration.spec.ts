import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import { MemberAuthSessionPrismaRepository } from './member-auth-session.prisma.repository';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { MemberRefreshTokenEntity } from '../../../domain/member-refresh-token.entity';
import { RefreshTokenRotationFailedError } from '../../../domain/member-refresh-token-rotation.error';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('MemberAuthSessionPrismaRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: MemberAuthSessionPrismaRepository;

  const runId = Date.now();
  const deviceId = `550e8400-e29b-41d4-a716-${runId}`;
  const sessionId = `session-${runId}`;
  const tokenHash = `hash-${runId}`;

  let testMemberId: number;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new MemberAuthSessionPrismaRepository(
      prisma as unknown as PrismaService,
    );

    const member = await prisma.member.create({
      data: {
        email: `member-auth-session-int-${runId}@integration.test`,
        password: 'pw',
        name: '세션통합회원',
        enrollmentNumber: `member-auth-session-${runId}`,
        isPermmited: 'ACCEPTED',
        clubId: null,
      },
    });
    testMemberId = member.memberId;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.memberRefreshToken.deleteMany({
      where: { memberId: testMemberId },
    });
    await prisma.memberDevice.deleteMany({
      where: { memberId: testMemberId },
    });
    await prisma.member.delete({ where: { memberId: testMemberId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('upsertDeviceOnLogin', () => {
    const newDeviceId = `device-new-${runId}`;

    afterAll(async () => {
      await prisma.memberDevice.deleteMany({
        where: { memberId: testMemberId, deviceId: newDeviceId },
      });
    });

    it('신규 디바이스면 isNewDevice가 true이고 행을 생성한다', async () => {
      const result = await repository.upsertDeviceOnLogin({
        memberId: testMemberId,
        deviceId: newDeviceId,
        deviceName: 'Pixel',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });

      expect(result).toEqual({ isNewDevice: true });

      const row = await prisma.memberDevice.findUnique({
        where: {
          memberId_deviceId: {
            memberId: testMemberId,
            deviceId: newDeviceId,
          },
        },
      });
      expect(row?.deviceName).toBe('Pixel');
      expect(row?.lastLoginAt).toBeInstanceOf(Date);
    });

    it('기존 디바이스면 isNewDevice가 false이고 lastLoginAt을 갱신한다', async () => {
      const before = await prisma.memberDevice.findUnique({
        where: {
          memberId_deviceId: {
            memberId: testMemberId,
            deviceId: newDeviceId,
          },
        },
        select: { lastLoginAt: true },
      });

      const result = await repository.upsertDeviceOnLogin({
        memberId: testMemberId,
        deviceId: newDeviceId,
        deviceName: 'Pixel 2',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });

      expect(result).toEqual({ isNewDevice: false });

      const after = await prisma.memberDevice.findUnique({
        where: {
          memberId_deviceId: {
            memberId: testMemberId,
            deviceId: newDeviceId,
          },
        },
      });
      expect(after?.deviceName).toBe('Pixel 2');
      expect(after!.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(
        before!.lastLoginAt!.getTime(),
      );
    });
  });

  describe('createRefreshToken / findRefreshTokenByHash', () => {
    let refreshTokenId: number;

    beforeAll(async () => {
      const created = await repository.createRefreshToken({
        memberId: testMemberId,
        sessionId,
        deviceId,
        tokenHash,
        rememberMe: false,
        deviceName: 'jest',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      refreshTokenId = created.id;
    });

    it('해시로 도메인 엔티티를 조회한다', async () => {
      const entity = await repository.findRefreshTokenByHash(tokenHash);

      expect(entity).toBeInstanceOf(MemberRefreshTokenEntity);
      expect(entity!.id).toBe(refreshTokenId);
      expect(entity!.memberId).toBe(testMemberId);
      expect(entity!.sessionId).toBe(sessionId);
      expect(entity!.deviceId).toBe(deviceId);
      expect(entity!.isRevoked()).toBe(false);
    });

    it('존재하지 않는 해시면 null을 반환한다', async () => {
      expect(await repository.findRefreshTokenByHash(`missing-${tokenHash}`)).toBeNull();
    });
  });

  describe('rotateRefreshToken', () => {
    const rotateSessionId = `rotate-session-${runId}`;
    const oldHash = `old-hash-${runId}`;
    const newHash = `new-hash-${runId}`;
    let oldTokenId: number;

    beforeAll(async () => {
      const created = await repository.createRefreshToken({
        memberId: testMemberId,
        sessionId: rotateSessionId,
        deviceId,
        tokenHash: oldHash,
        rememberMe: true,
        deviceName: 'jest',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      oldTokenId = created.id;
    });

    it('기존 토큰을 revoke하고 새 토큰을 연결한다', async () => {
      const newExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const result = await repository.rotateRefreshToken({
        oldTokenId,
        memberId: testMemberId,
        sessionId: rotateSessionId,
        deviceId,
        rememberMe: true,
        deviceName: 'jest',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        newTokenHash: newHash,
        newExpiresAt,
      });

      const oldRow = await prisma.memberRefreshToken.findUnique({
        where: { id: oldTokenId },
      });
      expect(oldRow?.revokedAt).toBeInstanceOf(Date);
      expect(oldRow?.replacedByTokenId).toBe(result.newRefreshTokenId);

      const newEntity = await repository.findRefreshTokenByHash(newHash);
      expect(newEntity?.id).toBe(result.newRefreshTokenId);
      expect(newEntity?.rememberMe).toBe(true);
    });

    it('이미 revoke된 토큰이면 RefreshTokenRotationFailedError를 던진다', async () => {
      await expect(
        repository.rotateRefreshToken({
          oldTokenId,
          memberId: testMemberId,
          sessionId: rotateSessionId,
          deviceId,
          rememberMe: true,
          deviceName: 'jest',
          userAgent: 'jest',
          ipAddress: '127.0.0.1',
          newTokenHash: `another-${newHash}`,
          newExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        }),
      ).rejects.toBeInstanceOf(RefreshTokenRotationFailedError);
    });
  });

  describe('revokeAllActiveTokensForSession', () => {
    const revokeSessionId = `revoke-session-${runId}`;

    beforeAll(async () => {
      await repository.createRefreshToken({
        memberId: testMemberId,
        sessionId: revokeSessionId,
        deviceId: `revoke-device-${runId}`,
        tokenHash: `revoke-hash-${runId}`,
        rememberMe: false,
        deviceName: 'jest',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
    });

    it('세션의 활성 토큰을 모두 revoke한다', async () => {
      await repository.revokeAllActiveTokensForSession({
        memberId: testMemberId,
        sessionId: revokeSessionId,
      });

      const rows = await prisma.memberRefreshToken.findMany({
        where: { memberId: testMemberId, sessionId: revokeSessionId },
      });
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.revokedAt !== null)).toBe(true);
    });
  });

  describe('revokeAllActiveTokensForMemberDevice', () => {
    const deviceA = `device-a-${runId}`;
    const deviceB = `device-b-${runId}`;
    const sessionA1 = `device-a-session-1-${runId}`;
    const sessionA2 = `device-a-session-2-${runId}`;
    const sessionB1 = `device-b-session-1-${runId}`;

    beforeAll(async () => {
      await repository.createRefreshToken({
        memberId: testMemberId,
        sessionId: sessionA1,
        deviceId: deviceA,
        tokenHash: `device-a-hash-1-${runId}`,
        rememberMe: false,
        deviceName: 'jest',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      await repository.createRefreshToken({
        memberId: testMemberId,
        sessionId: sessionA2,
        deviceId: deviceA,
        tokenHash: `device-a-hash-2-${runId}`,
        rememberMe: false,
        deviceName: 'jest',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      await repository.createRefreshToken({
        memberId: testMemberId,
        sessionId: sessionB1,
        deviceId: deviceB,
        tokenHash: `device-b-hash-1-${runId}`,
        rememberMe: false,
        deviceName: 'jest',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
    });

    it('지정 deviceId의 활성 토큰만 revoke하고 다른 device는 유지한다', async () => {
      await repository.revokeAllActiveTokensForMemberDevice({
        memberId: testMemberId,
        deviceId: deviceA,
      });

      const deviceARows = await prisma.memberRefreshToken.findMany({
        where: { memberId: testMemberId, deviceId: deviceA },
      });
      expect(deviceARows.length).toBeGreaterThan(0);
      expect(deviceARows.every((r) => r.revokedAt !== null)).toBe(true);

      const deviceBRows = await prisma.memberRefreshToken.findMany({
        where: { memberId: testMemberId, deviceId: deviceB },
      });
      expect(deviceBRows.length).toBeGreaterThan(0);
      expect(deviceBRows.every((r) => r.revokedAt === null)).toBe(true);
    });
  });

  describe('revokeAllActiveTokensForMember', () => {
    const memberWideSessionA = `member-wide-a-${runId}`;
    const memberWideSessionB = `member-wide-b-${runId}`;

    beforeAll(async () => {
      await repository.createRefreshToken({
        memberId: testMemberId,
        sessionId: memberWideSessionA,
        deviceId: `member-wide-device-a-${runId}`,
        tokenHash: `member-wide-hash-a-${runId}`,
        rememberMe: false,
        deviceName: 'jest',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      await repository.createRefreshToken({
        memberId: testMemberId,
        sessionId: memberWideSessionB,
        deviceId: `member-wide-device-b-${runId}`,
        tokenHash: `member-wide-hash-b-${runId}`,
        rememberMe: false,
        deviceName: 'jest',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
    });

    it('회원의 모든 활성 refresh token을 revoke한다', async () => {
      await repository.revokeAllActiveTokensForMember(testMemberId);

      const activeRows = await prisma.memberRefreshToken.findMany({
        where: { memberId: testMemberId, revokedAt: null },
      });
      expect(activeRows).toHaveLength(0);

      const allRows = await prisma.memberRefreshToken.findMany({
        where: { memberId: testMemberId },
      });
      expect(allRows.length).toBeGreaterThan(0);
      expect(allRows.every((r) => r.revokedAt !== null)).toBe(true);
    });
  });

  describe('deleteStaleRefreshTokensOlderThan', () => {
    const cutoff = new Date('2025-06-01T12:00:00.000Z');
    const dayMs = 24 * 60 * 60 * 1000;
    const beforeCutoff = new Date(cutoff.getTime() - dayMs);
    const afterCutoff = new Date(cutoff.getTime() + dayMs);

    const staleExpiredHash = `stale-expired-${runId}`;
    const staleRevokedHash = `stale-revoked-${runId}`;
    const keepActiveHash = `keep-active-${runId}`;
    const keepRevokedRecentHash = `keep-revoked-recent-${runId}`;

    const staleHashes = [
      staleExpiredHash,
      staleRevokedHash,
      keepActiveHash,
      keepRevokedRecentHash,
    ];

    async function seedRefreshTokenWithDates(params: {
      tokenHash: string;
      sessionId: string;
      expiresAt: Date;
      revokedAt: Date | null;
    }): Promise<void> {
      const created = await repository.createRefreshToken({
        memberId: testMemberId,
        sessionId: params.sessionId,
        deviceId: `stale-device-${params.tokenHash}`,
        tokenHash: params.tokenHash,
        rememberMe: false,
        deviceName: 'jest',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      await prisma.memberRefreshToken.update({
        where: { id: created.id },
        data: {
          expiresAt: params.expiresAt,
          revokedAt: params.revokedAt,
        },
      });
    }

    beforeAll(async () => {
      await seedRefreshTokenWithDates({
        tokenHash: staleExpiredHash,
        sessionId: `se-${runId}`,
        expiresAt: beforeCutoff,
        revokedAt: null,
      });
      await seedRefreshTokenWithDates({
        tokenHash: staleRevokedHash,
        sessionId: `sr-${runId}`,
        expiresAt: afterCutoff,
        revokedAt: beforeCutoff,
      });
      await seedRefreshTokenWithDates({
        tokenHash: keepActiveHash,
        sessionId: `ka-${runId}`,
        expiresAt: afterCutoff,
        revokedAt: null,
      });
      await seedRefreshTokenWithDates({
        tokenHash: keepRevokedRecentHash,
        sessionId: `krr-${runId}`,
        expiresAt: afterCutoff,
        revokedAt: afterCutoff,
      });
    });

    afterAll(async () => {
      await prisma.memberRefreshToken.deleteMany({
        where: { tokenHash: { in: staleHashes } },
      });
    });

    it('만료·오래된 revoke 토큰 2건을 삭제하고 활성·최근 revoke 토큰은 유지한다', async () => {
      const deletedCount =
        await repository.deleteStaleRefreshTokensOlderThan(cutoff);

      expect(deletedCount).toBe(2);
      expect(
        await repository.findRefreshTokenByHash(staleExpiredHash),
      ).toBeNull();
      expect(
        await repository.findRefreshTokenByHash(staleRevokedHash),
      ).toBeNull();
      expect(
        await repository.findRefreshTokenByHash(keepActiveHash),
      ).not.toBeNull();
      expect(
        await repository.findRefreshTokenByHash(keepRevokedRecentHash),
      ).not.toBeNull();
    });

    it('삭제 대상이 없으면 0을 반환한다', async () => {
      const deletedCount =
        await repository.deleteStaleRefreshTokensOlderThan(cutoff);

      expect(deletedCount).toBe(0);
    });
  });
});
