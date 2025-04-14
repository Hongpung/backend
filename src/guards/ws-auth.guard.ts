import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = client.handshake.auth?.token;

    if (!token) {
      return false; // 인증 토큰이 없으면 차단
    }

    try {
      const payload = await this.jwtService.verifyAsync(token); // 토큰 검증
      client['user'] = await payload; // 인증된 사용자 정보를 저장
      return true;
    } catch (err) {
      console.error('Invalid token:', err.message);
      return false;
    }
  }
}
