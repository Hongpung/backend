import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class VerifiedTokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access Denied: No Token Provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token,{secret:process.env.VERIFIED_SECRET_KEY});
      // 검증된 payload를 요청 객체에 저장
      if (!payload.verifiedEmail) throw new UnauthorizedException('Access Denied: Invalid Token');

      request.verificationToken = payload as { verifiedEmail: string };

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