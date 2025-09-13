import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { JwtTokenVerifierService } from '../../infrastructure/jwt/jwt-token-verifier.service';
import { TokenExtractor } from '../../infrastructure/jwt/token-extractor';
import { emitWsAuthError, WS_AUTH_ERROR_CODE } from './ws-auth-error';

@Injectable()
export class SessionListWsAuthGuard implements CanActivate {
  private readonly logger = new Logger(SessionListWsAuthGuard.name);

  constructor(private readonly tokenVerifier: JwtTokenVerifierService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = TokenExtractor.fromWebSocket(client);

    if (!token) {
      emitWsAuthError(client, WS_AUTH_ERROR_CODE.TOKEN_MISSING);
      return false;
    }

    try {
      const payload = await this.tokenVerifier.verifyToken(token);
      client['user'] = payload;
      return true;
    } catch (err) {
      this.logger.error(
        'WS: invalid token',
        err instanceof Error ? err.message : String(err),
      );
      emitWsAuthError(client, WS_AUTH_ERROR_CODE.TOKEN_INVALID);
      return false;
    }
  }
}
