import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtTokenVerifierService } from '../../infrastructure/jwt/jwt-token-verifier.service';
import { TokenExtractor } from '../../infrastructure/jwt/token-extractor';

@Injectable()
export class AdminAccessGuard implements CanActivate {
  constructor(private readonly tokenVerifier: JwtTokenVerifierService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (request.admin) {
      return true;
    }

    const token = TokenExtractor.fromHttpRequest(request);

    if (!token) {
      throw new UnauthorizedException('Access Denied: No Token Provided');
    }

    try {
      const payload = await this.tokenVerifier.verifyAdminToken(token);
      request.admin = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Access Denied: Invalid Token');
    }
  }
}
