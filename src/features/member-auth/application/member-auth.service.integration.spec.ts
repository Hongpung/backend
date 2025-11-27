import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { MemberAuthService } from './member-auth.service';
import { MemberAuthPrismaRepository } from '../infrastructure/out/prisma/member-auth.prisma.repository';
import { MemberAuthSessionPrismaRepository } from '../infrastructure/out/prisma/member-auth-session.prisma.repository';
import type { IMemberAuthDomainEventsPublisher } from './ports/out/member-auth-domain-events.publisher.port';
import type { IMemberAuthClearPushToken } from './ports/out/member-auth-clear-push-token.port';
import { MemberAuthClearPushTokenAdapter } from '../infrastructure/out/push-notification/member-auth-clear-push-token.adapter';
import { hashRefreshToken } from '../domain/member-refresh-token-hash';
import { PrismaNotificationTokenRepository } from 'src/features/push-notification/infrastructure/out/prisma/notification-token.prisma.repository';
import { PushNotificationTokenService } from 'src/features/push-notification/application/push-notification-token.service';
import { PushNotificationMemberLookupAdapter } from 'src/features/push-notification/infrastructure/out/adapters/push-notification-member-lookup.adapter';
import type { IMemberRepository } from 'src/features/member/application/ports/out/member.repository.port';
import { MemberLookupService } from 'src/features/member/application/use-case/member-lookup.use-case';
import { MemberPrismaRepository } from 'src/features/member/infrastructure/out/prisma/member.prisma.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const REFRESH_HASH_SECRET = 'integration-test-refresh-hash-secret';
const DEVICE_ID = '550e8400-e29b-41d4-a716-446655440000';

describeIntegration('MemberAuthService (통합)', () => {
  let prisma: PrismaClient;
  let service: MemberAuthService;
  let domainEvents: jest.Mocked<IMemberAuthDomainEventsPublisher>;
  let clearPushToken: jest.Mocked<Pick<IMemberAuthClearPushToken, 'clearPushToken'>>;

  const runId = Date.now();
  const acceptedEmail = `member-auth-svc-accepted-${runId}@integration.test`;
  const pendingEmail = `member-auth-svc-pending-${runId}@integration.test`;
  const plainPassword = 'integration-service-password';

  let acceptedMemberId: number;
  let pendingMemberId: number;
  let testClubId: number;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();

    const authRepository = new MemberAuthPrismaRepository(
      prisma as unknown as PrismaService,
    );
    const sessionRepository = new MemberAuthSessionPrismaRepository(
      prisma as unknown as PrismaService,
    );

    domainEvents = {
      publishNewDeviceLoginNotification: jest.fn(async () => undefined),
      publishRefreshTokenReused: jest.fn(),
    };

    clearPushToken = {
      clearPushToken: jest.fn(async () => undefined),
    };

    service = new MemberAuthService(
      new JwtService({ secret: 'integration-jwt-secret' }),
      authRepository,
      sessionRepository,
      domainEvents,
      REFRESH_HASH_SECRET,
      clearPushToken as unknown as IMemberAuthClearPushToken,
    );

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 20_000;
    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `member-auth-svc-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const accepted = await prisma.member.create({
      data: {
        email: acceptedEmail,
        password: hashedPassword,
        name: '서비스승인회원',
        enrollmentNumber: `member-auth-svc-${runId}-a`,
        isPermmited: 'ACCEPTED',
        clubId: null,
      },
    });
    acceptedMemberId = accepted.memberId;

    const pending = await prisma.member.create({
      data: {
        email: pendingEmail,
        password: hashedPassword,
        name: '서비스대기회원',
        enrollmentNumber: `member-auth-svc-${runId}-p`,
        isPermmited: 'PENDING',
        clubId: null,
      },
    });
    pendingMemberId = pending.memberId;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.memberRefreshToken.deleteMany({
      where: { memberId: { in: [acceptedMemberId, pendingMemberId] } },
    });
    await prisma.memberDevice.deleteMany({
      where: { memberId: { in: [acceptedMemberId, pendingMemberId] } },
    });
    await prisma.member.deleteMany({
      where: { memberId: { in: [acceptedMemberId, pendingMemberId] } },
    });
    await prisma.club.deleteMany({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('checkEmail', () => {
    it('등록된 이메일이면 isRegistered가 true이다', async () => {
      const result = await service.checkEmail(acceptedEmail);
      expect(result).toEqual({ isRegistered: true });
    });

    it('미등록 이메일이면 isRegistered가 false이다', async () => {
      const result = await service.checkEmail(`missing-${acceptedEmail}`);
      expect(result).toEqual({ isRegistered: false });
    });
  });

  describe('signup', () => {
    const signupWithClubEmail = `member-auth-svc-signup-club-${runId}@integration.test`;
    const signupNoClubEmail = `member-auth-svc-signup-noclub-${runId}@integration.test`;

    afterAll(async () => {
      await prisma.member.deleteMany({
        where: {
          email: { in: [signupWithClubEmail, signupNoClubEmail] },
        },
      });
    });

    it('유효한 clubId로 PENDING 회원을 bcrypt 해시와 함께 생성한다', async () => {
      const signupPassword = 'signup-integration-password';

      const result = await service.signup({
        email: signupWithClubEmail,
        password: signupPassword,
        name: '가입통합',
        enrollmentNumber: `member-auth-svc-signup-${runId}`,
        clubId: testClubId,
        nickname: '가입닉',
      });

      expect(result).toEqual({ message: 'SignUp Success' });

      const row = await prisma.member.findUnique({
        where: { email: signupWithClubEmail },
        select: {
          isPermmited: true,
          clubId: true,
          nickname: true,
          password: true,
        },
      });
      expect(row?.isPermmited).toBe('PENDING');
      expect(row?.clubId).toBe(testClubId);
      expect(row?.nickname).toBe('가입닉');
      expect(await bcrypt.compare(signupPassword, row!.password)).toBe(true);
    });

    it('clubId가 null이면 동아리 없이 PENDING 회원을 생성한다', async () => {
      const result = await service.signup({
        email: signupNoClubEmail,
        password: 'noclub-password',
        name: '무소속가입',
        enrollmentNumber: `member-auth-svc-noclub-${runId}`,
        clubId: null,
        nickname: null,
      });

      expect(result).toEqual({ message: 'SignUp Success' });

      const row = await prisma.member.findUnique({
        where: { email: signupNoClubEmail },
        select: { clubId: true, isPermmited: true },
      });
      expect(row?.clubId).toBeNull();
      expect(row?.isPermmited).toBe('PENDING');
    });

    it('존재하지 않는 clubId면 NotFoundException을 던진다', async () => {
      await expect(
        service.signup({
          email: `member-auth-svc-invalid-club-${runId}@integration.test`,
          password: 'pw',
          name: '잘못된동아리',
          enrollmentNumber: `member-auth-svc-invalid-${runId}`,
          clubId: testClubId + 99_999,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('changePassword', () => {
    const newPassword = 'changed-integration-password';

    afterAll(async () => {
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      await prisma.member.update({
        where: { memberId: acceptedMemberId },
        data: { password: hashedPassword },
      });
    });

    it('현재 비밀번호가 맞으면 새 해시로 갱신한다', async () => {
      const result = await service.changePassword({
        memberId: acceptedMemberId,
        currentPassword: plainPassword,
        newPassword,
      });

      expect(result).toEqual({ message: '비밀번호 변경이 완료되었습니다.' });

      const row = await prisma.member.findUnique({
        where: { memberId: acceptedMemberId },
        select: { password: true },
      });
      expect(await bcrypt.compare(newPassword, row!.password)).toBe(true);
    });

    it('현재 비밀번호가 틀리면 UnauthorizedException을 던진다', async () => {
      await expect(
        service.changePassword({
          memberId: acceptedMemberId,
          currentPassword: 'wrong-password',
          newPassword: 'another-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('존재하지 않는 memberId면 NotFoundException을 던진다', async () => {
      await expect(
        service.changePassword({
          memberId: acceptedMemberId + 99_999,
          currentPassword: plainPassword,
          newPassword: 'another-password',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('resetPassword', () => {
    const resetPassword = 'reset-integration-password';

    afterAll(async () => {
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      await prisma.member.update({
        where: { email: acceptedEmail },
        data: { password: hashedPassword },
      });
    });

    it('등록된 이메일의 비밀번호를 재설정한다', async () => {
      const result = await service.resetPassword({
        email: acceptedEmail,
        newPassword: resetPassword,
      });

      expect(result).toEqual({ message: '비밀번호 재설정이 완료되었습니다.' });

      const row = await prisma.member.findUnique({
        where: { email: acceptedEmail },
        select: { password: true },
      });
      expect(await bcrypt.compare(resetPassword, row!.password)).toBe(true);
    });

    it('존재하지 않는 이메일이면 NotFoundException을 던진다', async () => {
      await expect(
        service.resetPassword({
          email: `missing-${acceptedEmail}`,
          newPassword: resetPassword,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('비밀번호가 맞으면 회원을 삭제한다', async () => {
      const disposable = await prisma.member.create({
        data: {
          email: `member-auth-svc-remove-${runId}@integration.test`,
          password: await bcrypt.hash(plainPassword, 10),
          name: '탈퇴대상',
          enrollmentNumber: `member-auth-svc-remove-${runId}`,
          isPermmited: 'ACCEPTED',
          clubId: null,
        },
      });

      const result = await service.remove(disposable.memberId, plainPassword);

      expect(result).toEqual({ message: '회원 탈퇴가 완료되었습니다.' });
      expect(
        await prisma.member.findUnique({
          where: { memberId: disposable.memberId },
        }),
      ).toBeNull();
    });

    it('비밀번호가 틀리면 UnauthorizedException을 던진다', async () => {
      await expect(
        service.remove(acceptedMemberId, 'wrong-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('존재하지 않는 memberId면 BadRequestException을 던진다', async () => {
      await expect(
        service.remove(acceptedMemberId + 99_999, plainPassword),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('externalRemove', () => {
    it('이메일·비밀번호가 맞으면 회원을 삭제한다', async () => {
      const email = `member-auth-svc-ext-remove-${runId}@integration.test`;
      const disposable = await prisma.member.create({
        data: {
          email,
          password: await bcrypt.hash(plainPassword, 10),
          name: '외부탈퇴',
          enrollmentNumber: `member-auth-svc-ext-${runId}`,
          isPermmited: 'ACCEPTED',
          clubId: null,
        },
      });

      const result = await service.externalRemove({
        email,
        password: plainPassword,
      });

      expect(result).toEqual({ message: '회원 탈퇴가 완료되었습니다.' });
      expect(
        await prisma.member.findUnique({
          where: { memberId: disposable.memberId },
        }),
      ).toBeNull();
    });

    it('존재하지 않는 이메일이면 BadRequestException을 던진다', async () => {
      await expect(
        service.externalRemove({
          email: `missing-${acceptedEmail}`,
          password: plainPassword,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('비밀번호가 틀리면 UnauthorizedException을 던진다', async () => {
      await expect(
        service.externalRemove({
          email: acceptedEmail,
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('ACCEPTED 회원은 액세스·리프레시 토큰을 발급하고 DB에 세션을 저장한다', async () => {
      const result = await service.login({
        email: acceptedEmail,
        password: plainPassword,
        deviceId: DEVICE_ID,
        deviceName: 'integration',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        rememberMe: false,
      });

      expect(result.token).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));

      const tokenHash = hashRefreshToken(
        result.refreshToken,
        REFRESH_HASH_SECRET,
      );
      const row = await prisma.memberRefreshToken.findUnique({
        where: { tokenHash },
      });
      expect(row?.memberId).toBe(acceptedMemberId);
      expect(row?.deviceId).toBe(DEVICE_ID);
      expect(row?.revokedAt).toBeNull();

      const device = await prisma.memberDevice.findUnique({
        where: {
          memberId_deviceId: {
            memberId: acceptedMemberId,
            deviceId: DEVICE_ID,
          },
        },
      });
      expect(device).not.toBeNull();
    });

    it('PENDING 회원은 ForbiddenException(USER_NOT_APPROVED)을 던진다', async () => {
      let thrown: unknown;
      try {
        await service.login({
          email: pendingEmail,
          password: plainPassword,
          deviceId: DEVICE_ID,
        });
      } catch (e) {
        thrown = e;
      }

      expect(thrown).toBeInstanceOf(ForbiddenException);
      const body = (thrown as ForbiddenException).getResponse() as Record<
        string,
        unknown
      >;
      expect(body.errorCode).toBe('USER_NOT_APPROVED');
    });
  });

  describe('refreshTokens', () => {
    it('유효한 refresh 토큰이면 rotate 후 새 토큰 쌍을 반환한다', async () => {
      const login = await service.login({
        email: acceptedEmail,
        password: plainPassword,
        deviceId: DEVICE_ID,
        deviceName: 'integration',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });

      const refreshed = await service.refreshTokens({
        refreshToken: login.refreshToken,
        deviceId: DEVICE_ID,
        deviceName: 'integration',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });

      expect(refreshed.token).toEqual(expect.any(String));
      expect(refreshed.refreshToken).not.toBe(login.refreshToken);

      const oldHash = hashRefreshToken(login.refreshToken, REFRESH_HASH_SECRET);
      const oldRow = await prisma.memberRefreshToken.findUnique({
        where: { tokenHash: oldHash },
      });
      expect(oldRow?.revokedAt).toBeInstanceOf(Date);

      const newHash = hashRefreshToken(
        refreshed.refreshToken,
        REFRESH_HASH_SECRET,
      );
      const newRow = await prisma.memberRefreshToken.findUnique({
        where: { tokenHash: newHash },
      });
      expect(newRow?.revokedAt).toBeNull();
    });

    it('revoked 토큰 재사용 시 세션을 폐기하고 publishRefreshTokenReused 후 401이다', async () => {
      const login = await service.login({
        email: acceptedEmail,
        password: plainPassword,
        deviceId: `${DEVICE_ID}-reuse`,
        deviceName: 'integration',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });

      const refreshOpts = {
        deviceId: `${DEVICE_ID}-reuse`,
        deviceName: 'integration',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      } as const;

      const firstRefresh = await service.refreshTokens({
        refreshToken: login.refreshToken,
        ...refreshOpts,
      });

      await expect(
        service.refreshTokens({
          refreshToken: login.refreshToken,
          ...refreshOpts,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(domainEvents.publishRefreshTokenReused).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: acceptedMemberId,
          deviceId: `${DEVICE_ID}-reuse`,
        }),
      );

      const reusedHash = hashRefreshToken(
        firstRefresh.refreshToken,
        REFRESH_HASH_SECRET,
      );
      const reusedRow = await prisma.memberRefreshToken.findUnique({
        where: { tokenHash: reusedHash },
      });
      expect(reusedRow?.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('logout', () => {
    it('refreshToken 경로로 로그아웃하면 해당 세션의 활성 토큰을 revoke한다', async () => {
      const login = await service.login({
        email: acceptedEmail,
        password: plainPassword,
        deviceId: `${DEVICE_ID}-logout`,
        deviceName: 'integration',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });

      const tokenHash = hashRefreshToken(
        login.refreshToken,
        REFRESH_HASH_SECRET,
      );
      const before = await prisma.memberRefreshToken.findUnique({
        where: { tokenHash },
        select: { sessionId: true },
      });

      const result = await service.logout(acceptedMemberId, {
        refreshToken: login.refreshToken,
      });

      expect(result).toEqual({ message: '로그아웃이 완료되었습니다.' });

      const rows = await prisma.memberRefreshToken.findMany({
        where: {
          memberId: acceptedMemberId,
          sessionId: before!.sessionId,
        },
      });
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.revokedAt !== null)).toBe(true);
    });

    it('sessionId 경로로 해당 세션의 활성 토큰만 revoke한다', async () => {
      const login = await service.login({
        email: acceptedEmail,
        password: plainPassword,
        deviceId: `${DEVICE_ID}-session-logout`,
        deviceName: 'integration',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });

      const tokenHash = hashRefreshToken(
        login.refreshToken,
        REFRESH_HASH_SECRET,
      );
      const sessionRow = await prisma.memberRefreshToken.findUnique({
        where: { tokenHash },
        select: { sessionId: true },
      });

      const otherLogin = await service.login({
        email: acceptedEmail,
        password: plainPassword,
        deviceId: `${DEVICE_ID}-session-logout-other`,
        deviceName: 'integration',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });
      const otherHash = hashRefreshToken(
        otherLogin.refreshToken,
        REFRESH_HASH_SECRET,
      );
      const otherSessionRow = await prisma.memberRefreshToken.findUnique({
        where: { tokenHash: otherHash },
        select: { sessionId: true },
      });

      await service.logout(acceptedMemberId, {
        sessionId: sessionRow!.sessionId,
      });

      const targetRows = await prisma.memberRefreshToken.findMany({
        where: {
          memberId: acceptedMemberId,
          sessionId: sessionRow!.sessionId,
        },
      });
      expect(targetRows.every((r) => r.revokedAt !== null)).toBe(true);

      const otherRows = await prisma.memberRefreshToken.findMany({
        where: {
          memberId: acceptedMemberId,
          sessionId: otherSessionRow!.sessionId,
        },
      });
      expect(otherRows.some((r) => r.revokedAt === null)).toBe(true);
    });

    it('deviceId 경로로 해당 디바이스 토큰만 revoke하고 다른 디바이스는 유지한다', async () => {
      const deviceA = `${DEVICE_ID}-device-logout-a`;
      const deviceB = `${DEVICE_ID}-device-logout-b`;

      await service.login({
        email: acceptedEmail,
        password: plainPassword,
        deviceId: deviceA,
        deviceName: 'integration',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });
      await service.login({
        email: acceptedEmail,
        password: plainPassword,
        deviceId: deviceB,
        deviceName: 'integration',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });

      await service.logout(acceptedMemberId, { deviceId: deviceA });

      const deviceARows = await prisma.memberRefreshToken.findMany({
        where: { memberId: acceptedMemberId, deviceId: deviceA },
      });
      expect(deviceARows.every((r) => r.revokedAt !== null)).toBe(true);

      const deviceBRows = await prisma.memberRefreshToken.findMany({
        where: { memberId: acceptedMemberId, deviceId: deviceB },
      });
      expect(deviceBRows.some((r) => r.revokedAt === null)).toBe(true);
    });

    it('파라미터 없이 호출하면 회원의 모든 활성 토큰을 revoke한다', async () => {
      await service.login({
        email: acceptedEmail,
        password: plainPassword,
        deviceId: `${DEVICE_ID}-member-wide-logout`,
        deviceName: 'integration',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });

      const result = await service.logout(acceptedMemberId);

      expect(result).toEqual({ message: '로그아웃이 완료되었습니다.' });

      const activeRows = await prisma.memberRefreshToken.findMany({
        where: { memberId: acceptedMemberId, revokedAt: null },
      });
      expect(activeRows).toHaveLength(0);
    });

    it('refreshToken이 회원과 불일치하면 UnauthorizedException을 던진다', async () => {
      const login = await service.login({
        email: acceptedEmail,
        password: plainPassword,
        deviceId: `${DEVICE_ID}-mismatch`,
        deviceName: 'integration',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });

      await expect(
        service.logout(pendingMemberId, { refreshToken: login.refreshToken }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('clearPushTokens 실패 시 BadRequestException을 던지지만 revoke는 이미 완료된다', async () => {
      const failingClearPushToken = {
        clearPushToken: jest.fn(async () => {
          throw new Error('push clear failed');
        }),
      };
      const serviceWithFailingClear = new MemberAuthService(
        new JwtService({ secret: 'integration-jwt-secret' }),
        new MemberAuthPrismaRepository(prisma as unknown as PrismaService),
        new MemberAuthSessionPrismaRepository(prisma as unknown as PrismaService),
        domainEvents,
        REFRESH_HASH_SECRET,
        failingClearPushToken as unknown as IMemberAuthClearPushToken,
      );

      const login = await serviceWithFailingClear.login({
        email: acceptedEmail,
        password: plainPassword,
        deviceId: `${DEVICE_ID}-clear-fail`,
        deviceName: 'integration',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });

      await expect(
        serviceWithFailingClear.logout(acceptedMemberId, {
          refreshToken: login.refreshToken,
          clearPushTokens: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      const tokenHash = hashRefreshToken(
        login.refreshToken,
        REFRESH_HASH_SECRET,
      );
      const row = await prisma.memberRefreshToken.findUnique({
        where: { tokenHash },
      });
      expect(row?.revokedAt).toBeInstanceOf(Date);
    });

    it('clearPushTokens가 true이면 푸시 토큰을 DB에서 제거한다', async () => {
      const tokenRepository = new PrismaNotificationTokenRepository(
        prisma as unknown as PrismaService,
      );
      const memberRepository = new MemberPrismaRepository(
        prisma as unknown as PrismaService,
      );
      const memberLookupService = new MemberLookupService(
        memberRepository as unknown as IMemberRepository,
      );
      const memberLookup = new PushNotificationMemberLookupAdapter(
        memberLookupService,
      );
      const pushTokenService = new PushNotificationTokenService(
        tokenRepository,
        memberLookup,
      );
      const clearPushTokenAdapter = new MemberAuthClearPushTokenAdapter(
        pushTokenService,
      );
      const serviceWithRealClear = new MemberAuthService(
        new JwtService({ secret: 'integration-jwt-secret' }),
        new MemberAuthPrismaRepository(prisma as unknown as PrismaService),
        new MemberAuthSessionPrismaRepository(prisma as unknown as PrismaService),
        domainEvents,
        REFRESH_HASH_SECRET,
        clearPushTokenAdapter,
      );

      await prisma.member.update({
        where: { memberId: acceptedMemberId },
        data: {
          notificationToken: 'ExponentPushToken[logout-smoke]',
          pushEnable: true,
        },
      });

      const result = await serviceWithRealClear.logout(acceptedMemberId, {
        clearPushTokens: true,
      });

      expect(result).toEqual({ message: '로그아웃이 완료되었습니다.' });

      const row = await prisma.member.findUnique({
        where: { memberId: acceptedMemberId },
        select: { notificationToken: true, pushEnable: true },
      });
      expect(row?.notificationToken).toBeNull();
      expect(row?.pushEnable).toBe(false);
    });
  });
});
