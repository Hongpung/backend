import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access Denied: No Token Provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, { secret: process.env.ADMIN_SECRET_KEY });
      // 검증된 payload를 요청 객체에 저장
      if (!payload.adminId || !payload.adminRole) throw new UnauthorizedException('Access Denied: Invalid Token');

      request.admin = payload as { adminId: number, adminRole: string };

      return true;
    } catch {
      throw new UnauthorizedException('Access Denied: Invalid Token');
    }
  }

  private extractTokenFromHeader(request:Request): string | null {
    const authorizationHeader = request.headers['authorization'];
    if (!authorizationHeader) return null;

    const [type, token] = authorizationHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}