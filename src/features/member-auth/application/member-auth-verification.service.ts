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
import * as crypto from 'crypto';

const VERIFICATION_CODE_EXPIRATION_TIME = 5 * 60 * 1000; // 5분 (ms)
const VERIFICATION_COUNT_EXPIRATION_TIME = 60 * 60 * 1000;

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

  private emailVerificationCodeKey(email: string): string {
    return `${email}-email-verification-code`;
  }

  private emailVerificationCountKey(email: string): string {
    return `${email}-email-verification-count`;
  }

  private passwordVerificationCodeKey(email: string): string {
    return `${email}-password-verification-code`;
  }

  private passwordVerificationCountKey(email: string): string {
    return `${email}-password-verification-count`;
  }

  private async setEmailVerificationCount(
    email: string,
    count: number,
  ): Promise<void> {
    await this.verificationCache.set(
      this.emailVerificationCountKey(email),
      count,
      VERIFICATION_COUNT_EXPIRATION_TIME,
    );
  }

  private async getEmailVerificationCount(email: string): Promise<number> {
    return (
      (await this.verificationCache.get<number>(
        this.emailVerificationCountKey(email),
      )) || 0
    );
  }

  private async setPasswordVerificationCount(
    email: string,
    count: number,
  ): Promise<void> {
    await this.verificationCache.set(
      this.passwordVerificationCountKey(email),
      count,
      VERIFICATION_COUNT_EXPIRATION_TIME,
    );
  }

  private async getPasswordVerificationCount(email: string): Promise<number> {
    const verificationCount = await this.verificationCache.get<number>(
      this.passwordVerificationCountKey(email),
    );
    return Boolean(verificationCount) ? verificationCount : 0;
  }

  async sendEmailVerificationCode(email: string): Promise<void> {
    const verificationCount = await this.getEmailVerificationCount(email);

    if (verificationCount >= 5) {
      throw new Error('최대 인증 시도 횟수를 초과했습니다.');
    }

    const verificationCode = crypto.randomInt(100000, 1000000);
    await this.mailSender.sendEmailConfirmMail(email, verificationCode);
    await this.verificationCache.set(
      this.emailVerificationCodeKey(email),
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
    const cacheKey = this.emailVerificationCodeKey(email);
    const correctCode = await this.verificationCache.get<number>(cacheKey);

    if (!correctCode) {
      throw new Error('인증 코드가 만료되었습니다.');
    }

    if (correctCode !== Number(code)) {
      throw new Error('인증 코드가 일치하지 않습니다.');
    }

    await this.verificationCache.del(cacheKey);
    return { message: '인증이 완료되었습니다.' };
  }

  async sendPasswordVerificationCode(email: string): Promise<void> {
    const verificationCount = await this.getPasswordVerificationCount(email);
    if (verificationCount >= 5) {
      throw new Error('최대 인증 시도 횟수를 초과했습니다.');
    }

    const verificationCode = crypto.randomInt(100000, 1000000);
    await this.mailSender.sendPasswordModifyMail(email, verificationCode);
    await this.verificationCache.set(
      this.passwordVerificationCodeKey(email),
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
    const cacheKey = this.passwordVerificationCodeKey(email);
    const correctCode = await this.verificationCache.get<number>(cacheKey);

    if (!correctCode) {
      throw new Error('인증 코드가 만료되었습니다.');
    }

    if (correctCode !== Number(code)) {
      throw new Error('인증 코드가 일치하지 않습니다.');
    }

    await this.verificationCache.del(cacheKey);
    return { message: '인증이 완료되었습니다.' };
  }

  async issueVerificationToken(email: string): Promise<string> {
    return this.verificationTokenIssuer.issueVerificationToken(email);
  }
}
