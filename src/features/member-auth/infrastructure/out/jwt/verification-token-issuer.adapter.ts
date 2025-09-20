import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type VerificationTokenIssuerPort as IVerificationTokenIssuerPort } from '../../../application/ports/out/verification-token-issuer.port';

@Injectable()
export class VerificationTokenIssuerAdapter
  implements IVerificationTokenIssuerPort
{
  constructor(private readonly jwtService: JwtService) {}

  issueVerificationToken(email: string): Promise<string> {
    return this.jwtService.signAsync(
      { verifiedEmail: email },
      {
        secret: process.env.VERIFIED_SECRET_KEY,
        expiresIn: '5m',
      },
    );
  }
}
