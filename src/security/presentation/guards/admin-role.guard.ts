import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_ROLE_KEY, type AdminRoleValue } from '../admin-role.constants';
import { JwtTokenVerifierService } from '../../infrastructure/jwt/jwt-token-verifier.service';
import { TokenExtractor } from '../../infrastructure/jwt/token-extractor';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenVerifier: JwtTokenVerifierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRoleValue[]>(
      ADMIN_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Guard execution order can vary when multiple decorators compose UseGuards.
    // Populate request.admin here to make role checks order-independent.
    if (!request.admin) {
      const token = TokenExtractor.fromHttpRequest(request);

      if (!token) {
        throw new UnauthorizedException('Access Denied: No Token Provided');
      }

      try {
        const adminPayload = await this.tokenVerifier.verifyAdminToken(token);
        request.admin = adminPayload;
      } catch {
        throw new UnauthorizedException('Access Denied: Invalid Token');
      }
    }

    if (!requiredRoles.includes(request.admin?.adminRole)) {
      throw new ForbiddenException(
        `${requiredRoles.join(', ')} 관리자 권한이 필요합니다.`,
      );
    }

    return true;
  }
}
