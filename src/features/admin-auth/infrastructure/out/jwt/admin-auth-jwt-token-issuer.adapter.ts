import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type AdminAuthTokenIssuerPort as IAdminAuthTokenIssuerPort } from '../../../application/ports/out/token-issuer.port';

@Injectable()
export class AdminAuthJwtTokenIssuerAdapter
  implements IAdminAuthTokenIssuerPort
{
  constructor(private readonly jwtService: JwtService) {}

  async issueAdminToken(payload: {
    adminId: number;
    adminRole: string | null;
    clubId: number | null;
  }): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: process.env.ADMIN_SECRET_KEY,
      expiresIn: '1h',
    });
  }
}
