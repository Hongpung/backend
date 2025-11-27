import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MemberAuthService } from './member-auth.service';
import type { IMemberAuthRepository } from './ports/out/member-auth.repository.port';
import type { IMemberAuthSessionRepository } from './ports/out/member-auth-session.repository.port';
import type { IMemberAuthDomainEventsPublisher } from './ports/out/member-auth-domain-events.publisher.port';
import { MemberAuthEntity } from '../domain/member-auth.entity';
import { MemberRefreshTokenEntity } from '../domain/member-refresh-token.entity';
import {
  generateOpaqueRefreshToken,
  hashRefreshToken,
} from '../domain/member-refresh-token-hash';
import { RefreshTokenRotationFailedError } from '../domain/member-refresh-token-rotation.error';
import type { IMemberAuthClearPushToken } from './ports/out/member-auth-clear-push-token.port';

jest.mock('bcrypt');

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'session-uuid-fixed'),
}));

jest.mock('../domain/member-refresh-token-hash', () => ({
  generateOpaqueRefreshToken: jest.fn(() => 'opaque-refresh'),
  hashRefreshToken: jest.fn((plain: string) => `hash(${plain})`),
}));

describe('MemberAuthService', () => {
  let service: MemberAuthService;
  let repository: jest.Mocked<IMemberAuthRepository>;
  let sessionRepository: jest.Mocked<IMemberAuthSessionRepository>;
  let domainEvents: jest.Mocked<IMemberAuthDomainEventsPublisher>;
  let clearPushToken: jest.Mocked<Pick<IMemberAuthClearPushToken, 'clearPushToken'>>;
  let signAsync: jest.MockedFunction<
    (payload: unknown, options?: unknown) => Promise<string>
  >;

  const compareMock = bcrypt.compare as jest.MockedFunction<
    (data: string | Buffer, encrypted: string) => Promise<boolean>
  >;

  const hashMock = bcrypt.hash as jest.MockedFunction<
    (data: string | Buffer, saltOrRounds: string | number) => Promise<string>
  >;

  const mockGenRefresh = generateOpaqueRefreshToken as jest.MockedFunction<
    () => string
  >;
  const mockHashRefresh = hashRefreshToken as jest.MockedFunction<
    (plain: string, secret: string) => string
  >;

  beforeEach(() => {
    compareMock.mockClear();
    hashMock.mockClear();
    mockGenRefresh.mockClear().mockReturnValue('opaque-refresh');
    mockHashRefresh.mockImplementation((plain: string) => `hash(${plain})`);

    repository = {
      findAuthByEmail: jest.fn(),
      findAuthByMemberId: jest.fn(),
      isRegisteredEmail: jest.fn(),
      findClubById: jest.fn(),
      findMemberForLogin: jest.fn(),
      signup: jest.fn(),
      updateAuthPermission: jest.fn(),
      updateAuthPassword: jest.fn(),
      updateAuthPasswordByEmail: jest.fn(),
      deleteAuth: jest.fn(),
      findPendingSignupIds: jest.fn(),
      findPendingSignupIdsByClubId: jest.fn(),
      findMembersEmailName: jest.fn(),
    };

    sessionRepository = {
      upsertDeviceOnLogin: jest.fn(),
      createRefreshToken: jest.fn(),
      findRefreshTokenByHash: jest.fn(),
      rotateRefreshToken: jest.fn(),
      revokeAllActiveTokensForSession: jest.fn(),
      revokeAllActiveTokensForMemberDevice: jest.fn(),
      revokeAllActiveTokensForMember: jest.fn(),
      deleteStaleRefreshTokensOlderThan: jest.fn(),
    };

    domainEvents = {
      publishNewDeviceLoginNotification: jest.fn(),
      publishRefreshTokenReused: jest.fn(),
    };

    clearPushToken = {
      clearPushToken: jest.fn(),
    };

    signAsync = jest.fn() as jest.MockedFunction<
      (payload: unknown, options?: unknown) => Promise<string>
    >;

    service = new MemberAuthService(
      { signAsync } as unknown as JwtService,
      repository,
      sessionRepository,
      domainEvents,
      'secret',
      clearPushToken as unknown as IMemberAuthClearPushToken,
    );
  });

  describe('login', () => {
    const authEntity = new MemberAuthEntity(1, 'u@test.com', 'hashed');
    const deviceId = '550e8400-e29b-41d4-a716-446655440000';

    beforeEach(() => {
      sessionRepository.upsertDeviceOnLogin.mockResolvedValue({
        isNewDevice: false,
      });
      sessionRepository.createRefreshToken.mockResolvedValue({ id: 99 });
      signAsync.mockResolvedValue('access-jwt');
    });

    it('이메일로 auth가 없으면 UnauthorizedException을 던진다', async () => {
      repository.findAuthByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'u@test.com',
          password: 'x',
          deviceId,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(compareMock).not.toHaveBeenCalled();
    });

    it('canLogin이 false이면 ForbiddenException과 USER_NOT_APPROVED를 던진다', async () => {
      repository.findAuthByEmail.mockResolvedValue(authEntity);
      compareMock.mockResolvedValue(true);
      repository.findMemberForLogin.mockResolvedValue({
        clubId: null,
        canLogin: false,
      });

      let thrown: unknown;
      try {
        await service.login({
          email: 'u@test.com',
          password: 'ok',
          deviceId,
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
      expect(signAsync).not.toHaveBeenCalled();
    });

    it('정상 로그인 시 액세스·리프레시를 발급하고 액세스 TTL은 15m이다', async () => {
      repository.findAuthByEmail.mockResolvedValue(authEntity);
      compareMock.mockResolvedValue(true);
      repository.findMemberForLogin.mockResolvedValue({
        clubId: 7,
        canLogin: true,
      });

      await expect(
        service.login({
          email: 'u@test.com',
          password: 'ok',
          deviceId,
          rememberMe: false,
        }),
      ).resolves.toEqual({
        token: 'access-jwt',
        refreshToken: 'opaque-refresh',
      });

      expect(sessionRepository.createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: 1,
          sessionId: 'session-uuid-fixed',
          deviceId,
          rememberMe: false,
          tokenHash: 'hash(opaque-refresh)',
        }),
      );
      expect(signAsync).toHaveBeenCalledWith(
        authEntity.toJwtPayload({ clubId: 7, sid: 'session-uuid-fixed' }),
        { expiresIn: '15m' },
      );
    });

    it('rememberMe 또는 autoLogin이 true이면 refresh에 rememberMe가 true이다', async () => {
      repository.findAuthByEmail.mockResolvedValue(authEntity);
      compareMock.mockResolvedValue(true);
      repository.findMemberForLogin.mockResolvedValue({
        clubId: 2,
        canLogin: true,
      });

      await service.login({
        email: 'u@test.com',
        password: 'ok',
        deviceId,
        rememberMe: true,
      });
      expect(sessionRepository.createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ rememberMe: true }),
      );

      sessionRepository.createRefreshToken.mockClear();

      await service.login({
        email: 'u@test.com',
        password: 'ok',
        deviceId,
        autoLogin: true,
      });
      expect(sessionRepository.createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ rememberMe: true }),
      );
    });

    it('신규 디바이스면 SEND_NOTIFICATION을 발행한다', async () => {
      repository.findAuthByEmail.mockResolvedValue(authEntity);
      compareMock.mockResolvedValue(true);
      repository.findMemberForLogin.mockResolvedValue({
        clubId: 1,
        canLogin: true,
      });
      sessionRepository.upsertDeviceOnLogin.mockResolvedValue({
        isNewDevice: true,
      });

      await service.login({
        email: 'u@test.com',
        password: 'ok',
        deviceId,
        deviceName: 'Pixel',
        userAgent: 'ua',
        ipAddress: '127.0.0.1',
      });

      expect(domainEvents.publishNewDeviceLoginNotification).toHaveBeenCalledWith({
        memberId: 1,
        deviceName: 'Pixel',
      });
    });
  });

  describe('refreshTokens', () => {
    const authEntity = new MemberAuthEntity(1, 'u@test.com', 'hashed');
    const deviceId = '550e8400-e29b-41d4-a716-446655440000';

    it('revoked 토큰이면 세션을 폐기하고 재사용 이벤트를 발행한 뒤 401이다', async () => {
      sessionRepository.findRefreshTokenByHash.mockResolvedValue(
        new MemberRefreshTokenEntity(
          10,
          1,
          'sess',
          deviceId,
          false,
          new Date(Date.now() + 60_000),
          new Date(),
        ),
      );

      await expect(
        service.refreshTokens({
          refreshToken: 'old',
          deviceId,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(
        sessionRepository.revokeAllActiveTokensForSession,
      ).toHaveBeenCalledWith({
        memberId: 1,
        sessionId: 'sess',
      });
      expect(domainEvents.publishRefreshTokenReused).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: 1,
          sessionId: 'sess',
          deviceId,
        }),
      );
      expect(sessionRepository.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('rotate가 실패하면 재사용 탐지와 동일하게 세션을 폐기한다', async () => {
      sessionRepository.findRefreshTokenByHash.mockResolvedValue(
        new MemberRefreshTokenEntity(
          10,
          1,
          'sess',
          deviceId,
          false,
          new Date(Date.now() + 60_000),
          null,
        ),
      );
      repository.findMemberForLogin.mockResolvedValue({
        clubId: 3,
        canLogin: true,
      });
      repository.findAuthByMemberId.mockResolvedValue(authEntity);
      sessionRepository.rotateRefreshToken.mockRejectedValue(
        new RefreshTokenRotationFailedError(),
      );

      await expect(
        service.refreshTokens({ refreshToken: 'plain', deviceId }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(
        sessionRepository.revokeAllActiveTokensForSession,
      ).toHaveBeenCalledWith({
        memberId: 1,
        sessionId: 'sess',
      });
      expect(domainEvents.publishRefreshTokenReused).toHaveBeenCalled();
    });

    it('유효하면 rotate 후 새 토큰 쌍을 반환한다', async () => {
      sessionRepository.findRefreshTokenByHash.mockResolvedValue(
        new MemberRefreshTokenEntity(
          10,
          1,
          'sess',
          deviceId,
          true,
          new Date(Date.now() + 60_000),
          null,
        ),
      );
      repository.findMemberForLogin.mockResolvedValue({
        clubId: 3,
        canLogin: true,
      });
      repository.findAuthByMemberId.mockResolvedValue(authEntity);
      sessionRepository.rotateRefreshToken.mockResolvedValue({
        newRefreshTokenId: 11,
      });
      mockGenRefresh.mockReturnValueOnce('new-refresh');
      signAsync.mockResolvedValue('new-access');

      await expect(
        service.refreshTokens({ refreshToken: 'plain', deviceId }),
      ).resolves.toEqual({
        token: 'new-access',
        refreshToken: 'new-refresh',
      });

      expect(sessionRepository.rotateRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          oldTokenId: 10,
          sessionId: 'sess',
          deviceId,
          rememberMe: true,
          newTokenHash: 'hash(new-refresh)',
        }),
      );
      expect(signAsync).toHaveBeenCalledWith(
        authEntity.toJwtPayload({ clubId: 3, sid: 'sess' }),
        { expiresIn: '15m' },
      );
    });
  });

  describe('logout', () => {
    it('본문 없이 호출하면 회원의 활성 리프레시를 모두 폐기한다', async () => {
      await service.logout(5);
      expect(
        sessionRepository.revokeAllActiveTokensForMember,
      ).toHaveBeenCalledWith(5);
      expect(clearPushToken.clearPushToken).not.toHaveBeenCalled();
    });

    it('clearPushTokens가 true이면 notificationToken도 비운다', async () => {
      clearPushToken.clearPushToken.mockResolvedValue(undefined);

      await service.logout(5, { clearPushTokens: true });

      expect(clearPushToken.clearPushToken).toHaveBeenCalledWith(5);
    });

    it('clearPushTokens 실패 시 BadRequestException', async () => {
      clearPushToken.clearPushToken.mockRejectedValue(new Error());

      await expect(
        service.logout(5, { clearPushTokens: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refreshToken이 일치하지 않으면 UnauthorizedException', async () => {
      sessionRepository.findRefreshTokenByHash.mockResolvedValue(null);

      await expect(
        service.logout(5, { refreshToken: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('signup', () => {
    it('존재하지 않는 clubId이면 NotFoundException을 던진다', async () => {
      repository.findClubById.mockResolvedValue(null);

      await expect(
        service.signup({
          email: 'n@test.com',
          password: 'p',
          name: 'N',
          enrollmentNumber: '01',
          clubId: 999,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(hashMock).not.toHaveBeenCalled();
      expect(repository.signup).not.toHaveBeenCalled();
    });

    it('clubId가 0이면 동아리 존재 여부를 검증한다', async () => {
      repository.findClubById.mockResolvedValue({
        clubId: 0,
        clubName: '들녘',
      });
      hashMock.mockResolvedValue('hashed-0');

      await expect(
        service.signup({
          email: 'zero@test.com',
          password: 'plain',
          name: 'N',
          enrollmentNumber: '03',
          clubId: 0,
        }),
      ).resolves.toEqual({ message: 'SignUp Success' });

      expect(repository.findClubById).toHaveBeenCalledWith(0);
      expect(repository.signup).toHaveBeenCalledWith(
        expect.objectContaining({ clubId: 0 }),
      );
    });

    it('정상 가입 시 해시 후 signup을 호출하고 메시지를 반환한다', async () => {
      repository.findClubById.mockResolvedValue({
        clubId: 1,
        clubName: 'Club',
      });
      hashMock.mockResolvedValue('hashed-x');

      await expect(
        service.signup({
          email: 'n@test.com',
          password: 'plain',
          name: 'N',
          enrollmentNumber: '02',
          clubId: 1,
          nickname: 'nick',
        }),
      ).resolves.toEqual({ message: 'SignUp Success' });

      expect(hashMock).toHaveBeenCalledWith('plain', 10);
      expect(repository.signup).toHaveBeenCalledWith({
        email: 'n@test.com',
        password: 'hashed-x',
        name: 'N',
        enrollmentNumber: '02',
        clubId: 1,
        nickname: 'nick',
      });
    });
  });

  describe('changePassword', () => {
    const authEntity = new MemberAuthEntity(10, 'a@test.com', 'hashed-old');

    it('auth가 없으면 NotFoundException을 던진다', async () => {
      repository.findAuthByMemberId.mockResolvedValue(null);

      await expect(
        service.changePassword({
          memberId: 10,
          currentPassword: 'cur',
          newPassword: 'new',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('성공 시 updateAuthPassword를 호출한다', async () => {
      repository.findAuthByMemberId.mockResolvedValue(authEntity);
      compareMock.mockResolvedValue(true);
      hashMock.mockResolvedValue('hashed-new-pw');

      await expect(
        service.changePassword({
          memberId: 10,
          currentPassword: 'cur',
          newPassword: 'new',
        }),
      ).resolves.toEqual({ message: '비밀번호 변경이 완료되었습니다.' });

      expect(hashMock).toHaveBeenCalledWith('new', 10);
      expect(repository.updateAuthPassword).toHaveBeenCalledWith(
        10,
        'hashed-new-pw',
      );
    });
  });

  describe('remove', () => {
    const authEntity = new MemberAuthEntity(99, 'd@test.com', 'hp');

    it('성공 시 deleteAuth를 호출한다', async () => {
      repository.findAuthByMemberId.mockResolvedValue(authEntity);
      compareMock.mockResolvedValue(true);

      await expect(service.remove(99, 'pw')).resolves.toEqual({
        message: '회원 탈퇴가 완료되었습니다.',
      });
      expect(repository.deleteAuth).toHaveBeenCalledWith(99);
    });
  });
});
