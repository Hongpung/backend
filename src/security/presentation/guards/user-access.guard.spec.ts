import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { MemberTokenPayload } from 'src/security/domain/token-payload.types';
import { JwtTokenVerifierService } from '../../infrastructure/jwt/jwt-token-verifier.service';
import { UserAccessGuard } from './user-access.guard';

function makeRequest(
  partial: Partial<Request> & { user?: unknown } = {},
): Request & { user?: unknown } {
  return {
    headers: {},
    ...partial,
  } as Request & { user?: unknown };
}

function makeContext(
  req: Request & { user?: unknown },
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as ExecutionContext;
}

describe('UserAccessGuard', () => {
  let guard: UserAccessGuard;
  let verifyMemberToken: jest.MockedFunction<
    JwtTokenVerifierService['verifyMemberToken']
  >;

  beforeEach(() => {
    verifyMemberToken = jest.fn();
    guard = new UserAccessGuard({
      verifyMemberToken,
    } as unknown as JwtTokenVerifierService);
  });

  it('토큰이 없으면 Unauthorized를 던진다', async () => {
    await expect(guard.canActivate(makeContext(makeRequest()))).rejects.toThrow(
      new UnauthorizedException('Access Denied: No Token Provided'),
    );
    expect(verifyMemberToken).not.toHaveBeenCalled();
  });

  it('검증 실패 시 Unauthorized를 던진다', async () => {
    verifyMemberToken.mockRejectedValue(new Error('invalid'));

    const req = makeRequest({
      headers: { authorization: 'Bearer bad-token' },
    });

    await expect(guard.canActivate(makeContext(req))).rejects.toThrow(
      new UnauthorizedException('Access Denied: Invalid Token'),
    );
    expect(verifyMemberToken).toHaveBeenCalledWith('bad-token');
  });

  it('유효한 토큰이면 true를 반환하고 request.user에 payload를 설정한다', async () => {
    const payload: MemberTokenPayload = {
      memberId: 42,
      email: 'member@integration.test',
      clubId: null,
    };
    verifyMemberToken.mockResolvedValue(payload);

    const req = makeRequest({
      headers: { authorization: 'Bearer valid-token' },
    });

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(req.user).toEqual(payload);
    expect(verifyMemberToken).toHaveBeenCalledWith('valid-token');
  });

  it('Authorization Bearer 헤더에서 토큰을 추출해 검증한다', async () => {
    const payload: MemberTokenPayload = {
      memberId: 7,
      email: 'extract@integration.test',
      clubId: 3,
    };
    verifyMemberToken.mockResolvedValue(payload);

    const req = makeRequest({
      headers: { authorization: 'Bearer   spaced-token  ' },
    });

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(verifyMemberToken).toHaveBeenCalledWith('spaced-token');
  });

  it('Bearer가 아니면 토큰 없음으로 처리한다', async () => {
    const req = makeRequest({
      headers: { authorization: 'Basic abc' },
    });

    await expect(guard.canActivate(makeContext(req))).rejects.toThrow(
      new UnauthorizedException('Access Denied: No Token Provided'),
    );
    expect(verifyMemberToken).not.toHaveBeenCalled();
  });
});
