import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtTokenVerifierService } from '../../infrastructure/jwt/jwt-token-verifier.service';
import { TokenExtractor } from '../../infrastructure/jwt/token-extractor';

@Injectable()
export class VerifiedTokenGuard implements CanActivate {
  constructor(private readonly tokenVerifier: JwtTokenVerifierService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = TokenExtractor.fromHttpRequest(request);

    if (!token) {
      throw new UnauthorizedException('Access Denied: No Token Provided');
    }

    try {
      const payload = await this.tokenVerifier.verifyVerifiedToken(token);
      request.verificationToken = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Access Denied: Invalid Token');
    }
  }
}
