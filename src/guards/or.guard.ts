import { Injectable, CanActivate, ExecutionContext, Type, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_OR_KEY } from '../decorators/use-guards-or.decorator';
import { ModuleRef } from '@nestjs/core';

/**
 * OrGuard는 여러 Guard를 OR 조건으로 평가합니다.
 * 하나라도 통과하면 접근을 허용합니다.
 */
@Injectable()
export class OrGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly moduleRef: ModuleRef,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const guards: Type<CanActivate>[] = this.reflector.get<Type<CanActivate>[]>(GUARDS_OR_KEY, context.getHandler());

        if (!guards || guards.length === 0) {
            return false; // Guard가 설정되지 않은 경우 접근 거부
        }

        for (const Guard of guards) {
            try {
                // Guard 인스턴스를 ModuleRef를 통해 동적으로 가져옵니다.
                const guardInstance = this.moduleRef.get<CanActivate>(Guard, { strict: false });
                
                if (!guardInstance) {
                    throw new InternalServerErrorException(`Guard ${Guard.name} 인스턴스를 찾을 수 없습니다.`);
                }

                const result = await guardInstance.canActivate(context);
                if (result) {
                    return true; // 하나라도 통과하면 접근 허용
                }
            } catch (error) {
                // 개별 Guard의 오류를 로깅하거나 처리할 수 있습니다.
                // console.error(`Guard ${Guard.name}에서 오류 발생:`, error);
                // 필요에 따라 예외를 던지거나 무시할 수 있습니다.
            }
        }

        return false; // 모든 Guard가 실패하면 접근 거부
    }
}