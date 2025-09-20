import { Inject, Injectable } from '@nestjs/common';
import {
  IVerificationCache,
  VerificationCachePort,
} from './ports/out/verification-cache.port';
import { MemberAuthVerificationUseCasePort } from './ports/in/member-auth-verification.use-case.port';
import {
  MemberAuthMailSenderPort,
  type MemberAuthMailSenderPort as IMemberAuthMailSenderPort,
} from './ports/out/mail-sender.port';
import {
  VerificationTokenIssuerPort,
  type VerificationTokenIssuerPort as IVerificationTokenIssuerPort,
} from './ports/out/verification-token-issuer.port';

const VERIFICATION_CODE_EXPIRATION_TIME = 5 * 60 * 1000; // 5분 (ms)

@Injectable()
export class MemberAuthVerificationService
  implements MemberAuthVerificationUseCasePort
{
  constructor(
    @Inject(MemberAuthMailSenderPort)
    private readonly mailSender: IMemberAuthMailSenderPort,
    @Inject(VerificationTokenIssuerPort)
    private readonly verificationTokenIssuer: IVerificationTokenIssuerPort,
    @Inject(VerificationCachePort)
    private readonly verificationCache: IVerificationCache,
  ) {}

  private async setEmailVerificationCount(email: string, count: number): Promise<void> {
  
      await this.verificationCache.set(
        `${email}-email-verification-count`,
        count,
      );
  }

  private async getEmailVerificationCount(email: string): Promise<number> {
    return await this.verificationCache.get<number>(
      `${email}-email-verification-count`,
    ) || 0;
  }

  private async setPasswordVerificationCount(email: string, count: number): Promise<void> {
    await this.verificationCache.set(
      `${email}-password-verification-count`,
      count
    );
  }

  private async getPasswordVerificationCount(email: string): Promise<number> {
    const verificationCount = await this.verificationCache.get<number>(
      `${email}-password-verification-count`,
    );
    return Boolean(verificationCount) ? verificationCount : 0;
  }

  async sendEmailVerificationCode(email: string): Promise<void> {

    const verificationCount = await this.getEmailVerificationCount(email);
    
    if (verificationCount >= 5) {
      throw new Error('최대 인증 시도 횟수를 초과했습니다.');
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    await this.mailSender.sendEmailConfirmMail(email, verificationCode);
    await this.verificationCache.set(
      `${email}-email-verification-code`,
      verificationCode,
      VERIFICATION_CODE_EXPIRATION_TIME,
    );
    
    await this.setEmailVerificationCount(email, verificationCount + 1);
  }

  async verifyEmailVerificationCode(params: {
    email: string;
    code: string;
  }): Promise<{ message: string }> {
    const { email, code } = params;
    const correctCode = await this.verificationCache.get<number>(email);

    if (!correctCode) {
      throw new Error('인증 코드가 만료되었습니다.');
    }

    if (correctCode !== Number(code)) {
      throw new Error('인증 코드가 일치하지 않습니다.');
    }

    await this.verificationCache.del(email);
    return { message: '인증이 완료되었습니다.' };
  }

  async sendPasswordVerificationCode(email: string): Promise<void> {
    const verificationCount = await this.getPasswordVerificationCount(email);
    if (verificationCount >= 5) {
      throw new Error('최대 인증 시도 횟수를 초과했습니다.');
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    await this.mailSender.sendPasswordModifyMail(email, verificationCode);
    await this.verificationCache.set(
      `${email}-password-verification-code`,
      verificationCode,
      VERIFICATION_CODE_EXPIRATION_TIME,
    );

    await this.setPasswordVerificationCount(email, verificationCount + 1);
  }

  async verifyPasswordVerificationCode(params: {
    email: string;
    code: string;
  }): Promise<{ message: string }> {
    const { email, code } = params;
    const correctCode = await this.verificationCache.get<number>(email);

    if (!correctCode) {
      throw new Error('인증 코드가 만료되었습니다.');
    }

    if (correctCode !== Number(code)) {
      throw new Error('인증 코드가 일치하지 않습니다.');
    }

    await this.verificationCache.del(email);
    return { message: '인증이 완료되었습니다.' };
  }

  async issueVerificationToken(email: string): Promise<string> {
    return this.verificationTokenIssuer.issueVerificationToken(email);
  }
}
