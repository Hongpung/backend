import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { SessionOperationsService } from 'src/session/session-operations.service';

@Injectable()
export class SessionWsAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService,
    private readonly sessionOperation: SessionOperationsService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = client.handshake.auth?.token;

    if (!token) {
      return false; // 인증 토큰이 없으면 차단
    }

    try {

      const payload = await this.jwtService.verifyAsync(token); // 토큰 검증

      const { isCheckin } = this.sessionOperation.isCheckinUser(+payload.memberId);

      if (!isCheckin) {
        console.warn(`Invalid user ID: ${payload.memberId}`);

        client.emit('invalid-user')//
        client.disconnect();

        return false;
      } else {

        console.warn(`valid user ID: ${payload.memberId}`);
        return true;
      }

    } catch (err) {
      console.error('Invalid token:', err.message);
      return false;
    }
  }
}
