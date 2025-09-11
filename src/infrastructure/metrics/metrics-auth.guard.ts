import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { getMetricsClientIp } from './metrics-client-ip';
import {
  isMetricsClientIpAllowed,
  parseMetricsAllowedCidrs,
} from './metrics-ip-allowlist.util';

@Injectable()
export class MetricsAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const allowRaw = this.configService.get<string>('METRICS_ALLOWED_CIDRS');
    const allowEntries = parseMetricsAllowedCidrs(allowRaw);

    if (process.env.NODE_ENV === 'production' && allowEntries.length === 0) {
      throw new ForbiddenException('Metrics allowlist is not configured');
    }

    if (allowEntries.length > 0) {
      const clientIp = getMetricsClientIp(req);
      if (!isMetricsClientIpAllowed(clientIp, allowEntries)) {
        throw new ForbiddenException(
          'Metrics endpoint is not allowed from this address',
        );
      }
    }

    const username = this.configService.get<string>('METRICS_USERNAME');
    const password = this.configService.get<string>('METRICS_PASSWORD');

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
