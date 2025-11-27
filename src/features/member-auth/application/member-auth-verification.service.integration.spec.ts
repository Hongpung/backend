import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { MemberAuthVerificationService } from './member-auth-verification.service';
import type { IVerificationCache } from './ports/out/verification-cache.port';
import type { MemberAuthMailSenderPort } from './ports/out/mail-sender.port';
import type { VerificationTokenIssuerPort } from './ports/out/verification-token-issuer.port';

const VERIFICATION_CODE_EXPIRATION_TIME = 5 * 60 * 1000;

class InMemoryVerificationCache implements IVerificationCache {
  private readonly store = new Map<
    string,
    { value: unknown; expiresAt?: number }
  >();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt !== undefined && Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlMs !== undefined ? Date.now() + ttlMs : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe('MemberAuthVerificationService (통합)', () => {
  let service: MemberAuthVerificationService;
  let cache: InMemoryVerificationCache;
  let mailSender: jest.Mocked<MemberAuthMailSenderPort>;
  let tokenIssuer: jest.Mocked<VerificationTokenIssuerPort>;

  const email = 'verify-int@test.com';
  const passwordEmail = 'pw-verify-int@test.com';

  beforeEach(() => {
    cache = new InMemoryVerificationCache();
    mailSender = {
      sendSignUpAcceptedMail: jest.fn(async () => undefined),
      sendSignUpRequestedMail: jest.fn(async () => undefined),
      sendEmailConfirmMail: jest.fn(async () => undefined),
      sendPasswordModifyMail: jest.fn(async () => undefined),
    };
    tokenIssuer = {
      issueVerificationToken: jest.fn(async () => 'verify-token'),
    };

    service = new MemberAuthVerificationService(mailSender, tokenIssuer, cache);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('sendEmailVerificationCode', () => {
    it('발송 후 코드 키와 시도 횟수 키가 캐시에 저장된다', async () => {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

      await service.sendEmailVerificationCode(email);

      expect(
        await cache.get<number>(`${email}-email-verification-code`),
      ).toBe(100000);
      expect(
        await cache.get<number>(`${email}-email-verification-count`),
      ).toBe(1);
      expect(mailSender.sendEmailConfirmMail).toHaveBeenCalledWith(
        email,
        100000,
      );

      randomSpy.mockRestore();
    });

    it('여러 번 발송하면 시도 횟수가 누적된다', async () => {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

      await service.sendEmailVerificationCode(email);
      await service.sendEmailVerificationCode(email);
      await service.sendEmailVerificationCode(email);

      expect(
        await cache.get<number>(`${email}-email-verification-count`),
      ).toBe(3);
      expect(mailSender.sendEmailConfirmMail).toHaveBeenCalledTimes(3);

      randomSpy.mockRestore();
    });

    it('시도 횟수가 5회 이상이면 발송을 거부한다', async () => {
      await cache.set(`${email}-email-verification-count`, 5);

      await expect(service.sendEmailVerificationCode(email)).rejects.toThrow(
        '최대 인증 시도 횟수를 초과했습니다.',
      );
      expect(mailSender.sendEmailConfirmMail).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmailVerificationCode', () => {
    it('email 키에 사전 저장된 코드로 검증에 성공한다', async () => {
      await cache.set(email, 123456);

      await expect(
        service.verifyEmailVerificationCode({ email, code: '123456' }),
      ).resolves.toEqual({ message: '인증이 완료되었습니다.' });
      expect(await cache.get<number>(email)).toBeUndefined();
    });

    it('TTL 만료 후에는 만료 오류를 던진다', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-01T12:00:00.000Z'));

      await cache.set(email, 123456, VERIFICATION_CODE_EXPIRATION_TIME);
      jest.advanceTimersByTime(VERIFICATION_CODE_EXPIRATION_TIME + 1);

      await expect(
        service.verifyEmailVerificationCode({ email, code: '123456' }),
      ).rejects.toThrow('인증 코드가 만료되었습니다.');
    });

    // 프로덕션 버그: send는 `${email}-email-verification-code`에 저장하지만
    // verify는 `email` 키만 읽는다. 단위 테스트는 verify 전 email 키를 사전 주입한다.
    it('send 직후 verify는 email 키 불일치로 실패한다 (사전 주입 없음)', async () => {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

      await service.sendEmailVerificationCode(email);

      expect(
        await cache.get<number>(`${email}-email-verification-code`),
      ).toBe(100000);
      expect(await cache.get<number>(email)).toBeUndefined();

      await expect(
        service.verifyEmailVerificationCode({ email, code: '100000' }),
      ).rejects.toThrow('인증 코드가 만료되었습니다.');

      randomSpy.mockRestore();
    });
  });

  describe('sendPasswordVerificationCode', () => {
    it('발송 후 코드 키와 시도 횟수 키가 캐시에 저장된다', async () => {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await service.sendPasswordVerificationCode(passwordEmail);

      expect(
        await cache.get<number>(
          `${passwordEmail}-password-verification-code`,
        ),
      ).toBe(550000);
      expect(
        await cache.get<number>(
          `${passwordEmail}-password-verification-count`,
        ),
      ).toBe(1);
      expect(mailSender.sendPasswordModifyMail).toHaveBeenCalledWith(
        passwordEmail,
        550000,
      );

      randomSpy.mockRestore();
    });

    it('시도 횟수가 5회 이상이면 발송을 거부한다', async () => {
      await cache.set(`${passwordEmail}-password-verification-count`, 5);

      await expect(
        service.sendPasswordVerificationCode(passwordEmail),
      ).rejects.toThrow('최대 인증 시도 횟수를 초과했습니다.');
      expect(mailSender.sendPasswordModifyMail).not.toHaveBeenCalled();
    });
  });

  describe('verifyPasswordVerificationCode', () => {
    it('email 키에 사전 저장된 코드로 검증에 성공한다', async () => {
      await cache.set(passwordEmail, 888888);

      await expect(
        service.verifyPasswordVerificationCode({
          email: passwordEmail,
          code: '888888',
        }),
      ).resolves.toEqual({ message: '인증이 완료되었습니다.' });
      expect(await cache.get<number>(passwordEmail)).toBeUndefined();
    });
  });

  describe('issueVerificationToken', () => {
    it('검증 토큰 발급을 토큰 발급 포트에 위임한다', async () => {
      tokenIssuer.issueVerificationToken.mockResolvedValueOnce('issued-token');

      await expect(service.issueVerificationToken(email)).resolves.toBe(
        'issued-token',
      );
      expect(tokenIssuer.issueVerificationToken).toHaveBeenCalledWith(email);
    });
  });
});
