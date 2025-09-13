import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  isMemberTokenPayload,
  isAdminTokenPayload,
  isVerifiedTokenPayload,
} from '../../domain/token-payload.type-guards';

/**
 * JWT 토큰 검증 서비스.
 * Infrastructure 계층 - JwtService(외부 라이브러리) 의존.
 */
@Injectable()
export class JwtTokenVerifierService {
  constructor(private readonly jwtService: JwtService) {}

  async verifyMemberToken(token: string) {
    const payload = await this.jwtService.verifyAsync(token);
    if (!isMemberTokenPayload(payload)) {
      throw new Error('Invalid member token payload');
    }
    return payload;
  }

  async verifyAdminToken(token: string) {
    const payload = await this.jwtService.verifyAsync(token, {
      secret: process.env.ADMIN_SECRET_KEY,
    });
    if (!isAdminTokenPayload(payload)) {
      throw new Error('Invalid admin token payload');
    }
    return payload;
  }

  async verifyVerifiedToken(token: string) {
    const payload = await this.jwtService.verifyAsync(token, {
      secret: process.env.VERIFIED_SECRET_KEY,
    });
    if (!isVerifiedTokenPayload(payload)) {
      throw new Error('Invalid verified token payload');
    }
    return payload;
  }

  /**
   * Member/Admin 공통 - 기본 secret으로 검증 (WS 등에서 사용)
   */
  async verifyToken(token: string): Promise<Record<string, unknown>> {
    return this.jwtService.verifyAsync(token);
  }
}
