import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class MetricsAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const username = this.configService.get<string>('METRICS_USERNAME');
    const password = this.configService.get<string>('METRICS_PASSWORD');

    // 설정이 없으면 비활성화(개발 편의). 운영에서는 반드시 설정 권장.
    if (!username || !password) {
      return true;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Basic ')) {
      throw new UnauthorizedException('Metrics endpoint requires Basic auth');
    }

    const encoded = authHeader.slice(6);
    let decoded: string;
    try {
      decoded = Buffer.from(encoded, 'base64').toString('utf8');
    } catch {
      throw new UnauthorizedException('Invalid Authorization header');
    }

    const [user, pass] = decoded.split(':', 2);
    if (user !== username || pass !== password) {
      throw new UnauthorizedException('Invalid metrics credentials');
    }

    return true;
  }
}
