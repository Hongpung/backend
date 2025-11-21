import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { OrGuard } from './or.guard';

class PassingGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

class FailingGuard implements CanActivate {
  canActivate(): boolean {
    return false;
  }
}

class FirstUnauthorizedGuard implements CanActivate {
  canActivate(): never {
    throw new UnauthorizedException('Access Denied: Invalid Token');
  }
}

class SecondUnauthorizedGuard implements CanActivate {
  canActivate(): never {
    throw new UnauthorizedException('Access Denied: No Token Provided');
  }
}

class ForbiddenRoleGuard implements CanActivate {
  canActivate(): never {
    throw new ForbiddenException('SUB 관리자 권한이 필요합니다.');
  }
}

class BrokenGuard implements CanActivate {
  canActivate(): never {
    throw new InternalServerErrorException('guard misconfigured');
  }
}

function makeContext(): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('OrGuard', () => {
  let reflector: Reflector;
  let moduleRef: ModuleRef;
  let guard: OrGuard;

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as unknown as Reflector;
    moduleRef = {
      get: jest.fn(),
    } as unknown as ModuleRef;
    guard = new OrGuard(reflector, moduleRef);
  });

  it('하나라도 통과하면 true를 반환한다', async () => {
    jest
      .spyOn(reflector, 'get')
      .mockReturnValue([FirstUnauthorizedGuard, PassingGuard]);
    jest.spyOn(moduleRef, 'get').mockImplementation((token) => {
      if (token === FirstUnauthorizedGuard) {
        return new FirstUnauthorizedGuard();
      }
      return new PassingGuard();
    });

    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
  });

  it('모든 Guard가 실패하면 마지막 UnauthorizedException을 그대로 던진다', async () => {
    jest
      .spyOn(reflector, 'get')
      .mockReturnValue([FirstUnauthorizedGuard, SecondUnauthorizedGuard]);
    jest.spyOn(moduleRef, 'get').mockImplementation((token) => {
      if (token === FirstUnauthorizedGuard) {
        return new FirstUnauthorizedGuard();
      }
      return new SecondUnauthorizedGuard();
    });

    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      new UnauthorizedException('Access Denied: No Token Provided'),
    );
  });

  it('Guard가 false만 반환하면 UnauthorizedException을 던진다', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue([FailingGuard]);
    jest.spyOn(moduleRef, 'get').mockReturnValue(new FailingGuard());

    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      new UnauthorizedException('Access Denied'),
    );
  });

  it('Guard 목록이 없으면 UnauthorizedException을 던진다', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);

    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      new UnauthorizedException('Access Denied: No Guard Configured'),
    );
  });

  it('마지막 guard의 ForbiddenException도 그대로 전파한다', async () => {
    jest
      .spyOn(reflector, 'get')
      .mockReturnValue([FirstUnauthorizedGuard, ForbiddenRoleGuard]);
    jest.spyOn(moduleRef, 'get').mockImplementation((token) => {
      if (token === FirstUnauthorizedGuard) {
        return new FirstUnauthorizedGuard();
      }
      return new ForbiddenRoleGuard();
    });

    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      new ForbiddenException('SUB 관리자 권한이 필요합니다.'),
    );
  });

  it('마지막 guard의 InternalServerErrorException도 그대로 전파한다', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue([BrokenGuard]);
    jest.spyOn(moduleRef, 'get').mockReturnValue(new BrokenGuard());

    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
