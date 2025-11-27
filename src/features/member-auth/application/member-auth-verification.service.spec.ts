import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MemberAuthVerificationService } from './member-auth-verification.service';
import type { IVerificationCache } from './ports/out/verification-cache.port';
import type { MemberAuthMailSenderPort } from './ports/out/mail-sender.port';
import type { VerificationTokenIssuerPort } from './ports/out/verification-token-issuer.port';

describe('MemberAuthVerificationService', () => {
  let service: MemberAuthVerificationService;
  let cache: jest.Mocked<IVerificationCache>;
  let mailSender: jest.Mocked<MemberAuthMailSenderPort>;
  let tokenIssuer: jest.Mocked<VerificationTokenIssuerPort>;

  beforeEach(() => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<IVerificationCache>;
    mailSender = {
      sendEmailConfirmMail: jest.fn(),
      sendPasswordModifyMail: jest.fn(),
    } as unknown as jest.Mocked<MemberAuthMailSenderPort>;
    tokenIssuer = {
      issueVerificationToken: jest.fn(),
    } as unknown as jest.Mocked<VerificationTokenIssuerPort>;

    service = new MemberAuthVerificationService(mailSender, tokenIssuer, cache);
  });

  it('이메일 인증 코드 발송 후 캐시에 저장하고 시도 횟수를 증가시킨다', async () => {
    cache.get.mockResolvedValue(0 as never);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    await service.sendEmailVerificationCode('user@test.com');

    expect(cache.get).toHaveBeenCalledWith(
      'user@test.com-email-verification-count',
    );
    expect(mailSender.sendEmailConfirmMail).toHaveBeenCalledWith(
      'user@test.com',
      100000,
    );
    expect(cache.set).toHaveBeenCalledWith(
      'user@test.com-email-verification-code',
      100000,
      5 * 60 * 1000,
    );
    expect(cache.set).toHaveBeenCalledWith(
      'user@test.com-email-verification-count',
      1,
    );

    randomSpy.mockRestore();
  });

  it('이메일 인증 시도 횟수가 5회 이상이면 오류를 던진다', async () => {
    cache.get.mockResolvedValue(5 as never);

    await expect(
      service.sendEmailVerificationCode('user@test.com'),
    ).rejects.toThrow('최대 인증 시도 횟수를 초과했습니다.');
    expect(mailSender.sendEmailConfirmMail).not.toHaveBeenCalled();
  });

  it('이메일 인증 코드 검증 성공 시 캐시 키를 삭제한다', async () => {
    cache.get.mockResolvedValue(123456 as never);

    await expect(
      service.verifyEmailVerificationCode({
        email: 'user@test.com',
        code: '123456',
      }),
    ).resolves.toEqual({ message: '인증이 완료되었습니다.' });
    expect(cache.get).toHaveBeenCalledWith('user@test.com');
    expect(cache.del).toHaveBeenCalledWith('user@test.com');
  });

  it('이메일 인증 코드가 만료된 경우 오류를 던진다', async () => {
    cache.get.mockResolvedValue(undefined as never);

    await expect(
      service.verifyEmailVerificationCode({
        email: 'user@test.com',
        code: '123456',
      }),
    ).rejects.toThrow('인증 코드가 만료되었습니다.');
    expect(cache.del).not.toHaveBeenCalled();
  });

  it('이메일 인증 코드가 불일치하면 오류를 던진다', async () => {
    cache.get.mockResolvedValue(123456 as never);

    await expect(
      service.verifyEmailVerificationCode({
        email: 'user@test.com',
        code: '654321',
      }),
    ).rejects.toThrow('인증 코드가 일치하지 않습니다.');
  });

  it('검증 토큰 발급을 포트에 위임한다', async () => {
    tokenIssuer.issueVerificationToken.mockResolvedValue('verify-token');

    await expect(service.issueVerificationToken('user@test.com')).resolves.toBe(
      'verify-token',
    );
    expect(tokenIssuer.issueVerificationToken).toHaveBeenCalledWith(
      'user@test.com',
    );
  });

  it('비밀번호 변경용 인증 코드를 발송하고 캐시에 저장한다', async () => {
    cache.get.mockResolvedValue(0 as never);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

    await service.sendPasswordVerificationCode('pw@test.com');

    expect(cache.get).toHaveBeenCalledWith(
      'pw@test.com-password-verification-count',
    );
    expect(mailSender.sendPasswordModifyMail).toHaveBeenCalledWith(
      'pw@test.com',
      550000,
    );
    expect(cache.set).toHaveBeenCalledWith(
      'pw@test.com-password-verification-code',
      550000,
      5 * 60 * 1000,
    );
    expect(cache.set).toHaveBeenCalledWith(
      'pw@test.com-password-verification-count',
      1,
    );

    randomSpy.mockRestore();
  });

  it('비밀번호 인증 시도 횟수가 5회 이상이면 오류를 던진다', async () => {
    cache.get.mockResolvedValue(5 as never);

    await expect(
      service.sendPasswordVerificationCode('pw@test.com'),
    ).rejects.toThrow('최대 인증 시도 횟수를 초과했습니다.');
    expect(mailSender.sendPasswordModifyMail).not.toHaveBeenCalled();
  });

  it('비밀번호 인증 코드 검증 성공 시 캐시 키를 삭제한다', async () => {
    cache.get.mockResolvedValue(888888 as never);

    await expect(
      service.verifyPasswordVerificationCode({
        email: 'pw@test.com',
        code: '888888',
      }),
    ).resolves.toEqual({ message: '인증이 완료되었습니다.' });
    expect(cache.get).toHaveBeenCalledWith('pw@test.com');
    expect(cache.del).toHaveBeenCalledWith('pw@test.com');
  });

  it('비밀번호 인증 코드가 만료된 경우 오류를 던진다', async () => {
    cache.get.mockResolvedValue(undefined as never);

    await expect(
      service.verifyPasswordVerificationCode({
        email: 'pw@test.com',
        code: '111111',
      }),
    ).rejects.toThrow('인증 코드가 만료되었습니다.');
  });

  it('비밀번호 인증 코드가 일치하지 않으면 오류를 던진다', async () => {
    cache.get.mockResolvedValue(111111 as never);

    await expect(
      service.verifyPasswordVerificationCode({
        email: 'pw@test.com',
        code: '222222',
      }),
    ).rejects.toThrow('인증 코드가 일치하지 않습니다.');
  });
});
