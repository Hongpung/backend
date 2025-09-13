import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Type,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_OR_KEY } from '../decorators/use-guards-or.decorator';
import { ModuleRef } from '@nestjs/core';

/**
 * OrGuard는 여러 Guard를 OR 조건으로 평가합니다.
 * 하나라도 통과하면 접근을 허용합니다.
 * 모든 Guard가 실패하면 마지막 guard가 던진 예외를 그대로 전파합니다.
 * (return false → Nest 기본 403 Forbidden resource 방지)
 */
@Injectable()
export class OrGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const guards: Type<CanActivate>[] = this.reflector.get<Type<CanActivate>[]>(
      GUARDS_OR_KEY,
      context.getHandler(),
    );

    if (!guards || guards.length === 0) {
      throw new UnauthorizedException('Access Denied: No Guard Configured');
    }

    let lastError: unknown;

    for (const Guard of guards) {
      try {
        const guardInstance = this.moduleRef.get<CanActivate>(Guard, {
          strict: false,
        });

        if (!guardInstance) {
          throw new InternalServerErrorException(
            `Guard ${Guard.name} 인스턴스를 찾을 수 없습니다.`,
          );
        }

        const result = await guardInstance.canActivate(context);
        if (result) {
          return true;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError !== undefined) {
      throw lastError;
    }

    throw new UnauthorizedException('Access Denied');
  }
}
