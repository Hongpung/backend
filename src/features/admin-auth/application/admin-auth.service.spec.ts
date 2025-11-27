import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthCredentialService } from './admin-auth-credential.service';
import { AdminAuthEntity } from '../domain/admin-auth.entity';
import type { IAdminAuthRepository } from './ports/out/admin-auth.repository.port';
import type { AdminAuthTokenIssuerPort } from './ports/out/token-issuer.port';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AdminAuthService (관리자 인증 유즈케이스)', () => {
  let service: AdminAuthService;
  let repository: jest.Mocked<IAdminAuthRepository>;
  let tokenIssuer: jest.Mocked<AdminAuthTokenIssuerPort>;

  const compareMock = bcrypt.compare as jest.MockedFunction<
    (
      data: string | Buffer<ArrayBufferLike>,
      encrypted: string,
    ) => Promise<boolean>
  >;
  beforeEach(() => {
    compareMock.mockClear();

    repository = {
      findAuthByEmail: jest.fn(),
      findAdminByMemberId: jest.fn(),
    } as unknown as jest.Mocked<IAdminAuthRepository>;

    tokenIssuer = {
      issueAdminToken: jest.fn(),
    } as unknown as jest.Mocked<AdminAuthTokenIssuerPort>;

    service = new AdminAuthService(
      repository,
      tokenIssuer,
      new AdminAuthCredentialService(),
    );
  });

  it('유효한 관리자 로그인 시 토큰을 발급한다', async () => {
    const admin = new AdminAuthEntity(
      1,
      'admin@test.com',
      'hashed',
      'SUPER',
      1,
    );
    repository.findAuthByEmail.mockResolvedValue(admin);
    compareMock.mockResolvedValue(true);
    tokenIssuer.issueAdminToken.mockResolvedValue('token-1');

    await expect(
      service.adminLogin('admin@test.com', 'plain'),
    ).resolves.toEqual({ token: 'token-1' });
    expect(tokenIssuer.issueAdminToken).toHaveBeenCalledWith(
      admin.toJwtPayload(),
    );
  });

  it('비밀번호가 일치하지 않으면 UnauthorizedException', async () => {
    repository.findAuthByEmail.mockResolvedValue(
      new AdminAuthEntity(1, 'admin@test.com', 'hashed', 'SUPER', 1),
    );
    compareMock.mockResolvedValue(false);

    await expect(
      service.adminLogin('admin@test.com', 'wrong'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('토큰 연장 시 멤버가 없으면 NotFoundException', async () => {
    repository.findAdminByMemberId.mockResolvedValue(null);

    await expect(service.adminExtendToken(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('이메일에 해당하는 계정이 없으면 UnauthorizedException', async () => {
    repository.findAuthByEmail.mockResolvedValue(null);

    await expect(
      service.adminLogin('missing@test.com', 'any'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(compareMock).not.toHaveBeenCalled();
  });

  it('일반 멤버(adminLevel null) 로그인 시 UnauthorizedException', async () => {
    repository.findAuthByEmail.mockResolvedValue(
      new AdminAuthEntity(3, 'user@test.com', 'hashed', null, null),
    );
    compareMock.mockResolvedValue(true);

    await expect(
      service.adminLogin('user@test.com', 'plain'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokenIssuer.issueAdminToken).not.toHaveBeenCalled();
  });

  it('유효한 관리자 토큰 연장 시 새 토큰을 발급한다', async () => {
    const admin = new AdminAuthEntity(
      5,
      'admin@test.com',
      'hashed',
      'SUPER',
      2,
    );
    repository.findAdminByMemberId.mockResolvedValue(admin);
    tokenIssuer.issueAdminToken.mockResolvedValue('token-extended');

    await expect(service.adminExtendToken(5)).resolves.toEqual({
      token: 'token-extended',
    });
    expect(tokenIssuer.issueAdminToken).toHaveBeenCalledWith(
      admin.toJwtPayload(),
    );
  });

  it('토큰 연장 대상이 비관리자면 UnauthorizedException', async () => {
    repository.findAdminByMemberId.mockResolvedValue(
      new AdminAuthEntity(8, 'user@test.com', 'hashed', null, null),
    );

    await expect(service.adminExtendToken(8)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(tokenIssuer.issueAdminToken).not.toHaveBeenCalled();
  });
});
