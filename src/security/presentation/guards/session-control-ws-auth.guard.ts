import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { JwtTokenVerifierService } from '../../infrastructure/jwt/jwt-token-verifier.service';
import { TokenExtractor } from '../../infrastructure/jwt/token-extractor';
import { SessionOperationsService } from 'src/features/session/application/services/session-operations.service';
import {
  emitLegacyInvalidUser,
  emitWsAuthError,
  WS_AUTH_ERROR_CODE,
} from './ws-auth-error';

@Injectable()
export class SessionControlWsAuthGuard implements CanActivate {
  private readonly logger = new Logger(SessionControlWsAuthGuard.name);

  constructor(
    private readonly tokenVerifier: JwtTokenVerifierService,
    private readonly sessionOperation: SessionOperationsService,
  ) {}

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

      const { isCheckin } = this.sessionOperation.isCheckinUser(
        +payload.memberId,
      );

      if (!isCheckin) {
        this.logger.warn(`WS: memberId ${payload.memberId} is not checked in`);
        emitLegacyInvalidUser(client);
        emitWsAuthError(client, WS_AUTH_ERROR_CODE.USER_NOT_CHECKED_IN);
        client.disconnect();
        return false;
      }

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
