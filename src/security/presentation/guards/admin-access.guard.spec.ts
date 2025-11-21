import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AdminTokenPayload } from 'src/security/domain/token-payload.types';
import { JwtTokenVerifierService } from '../../infrastructure/jwt/jwt-token-verifier.service';
import { AdminAccessGuard } from './admin-access.guard';

function makeRequest(
  partial: Partial<Request> & { admin?: unknown } = {},
): Request & { admin?: unknown } {
  return {
    headers: {},
    ...partial,
  } as Request & { admin?: unknown };
}

function makeContext(
  req: Request & { admin?: unknown },
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as ExecutionContext;
}

describe('AdminAccessGuard', () => {
  let guard: AdminAccessGuard;
  let verifyAdminToken: jest.MockedFunction<
    JwtTokenVerifierService['verifyAdminToken']
  >;

  beforeEach(() => {
    verifyAdminToken = jest.fn();
    guard = new AdminAccessGuard({
      verifyAdminToken,
    } as unknown as JwtTokenVerifierService);
  });

  it('request.admin이 이미 있으면 검증 없이 통과한다', async () => {
    const existing: AdminTokenPayload = {
      adminId: 1,
      adminRole: 'SUPER',
      clubId: null,
    };
    const req = makeRequest({ admin: existing });

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(req.admin).toEqual(existing);
    expect(verifyAdminToken).not.toHaveBeenCalled();
  });

  it('토큰이 없으면 Unauthorized를 던진다', async () => {
    await expect(guard.canActivate(makeContext(makeRequest()))).rejects.toThrow(
      new UnauthorizedException('Access Denied: No Token Provided'),
    );
    expect(verifyAdminToken).not.toHaveBeenCalled();
  });

  it('검증 실패 시 Unauthorized를 던진다', async () => {
    verifyAdminToken.mockRejectedValue(new Error('invalid'));

    const req = makeRequest({
      headers: { authorization: 'Bearer bad-admin-token' },
    });

    await expect(guard.canActivate(makeContext(req))).rejects.toThrow(
      new UnauthorizedException('Access Denied: Invalid Token'),
    );
    expect(verifyAdminToken).toHaveBeenCalledWith('bad-admin-token');
  });

  it('유효한 토큰이면 true를 반환하고 request.admin에 payload를 설정한다', async () => {
    const payload: AdminTokenPayload = {
      adminId: 99,
      adminRole: 'SUB',
      clubId: 5,
    };
    verifyAdminToken.mockResolvedValue(payload);

    const req = makeRequest({
      headers: { authorization: 'Bearer valid-admin-token' },
    });

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(req.admin).toEqual(payload);
    expect(verifyAdminToken).toHaveBeenCalledWith('valid-admin-token');
  });
});
