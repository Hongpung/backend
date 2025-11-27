import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { MemberAuthAdminService } from './member-auth-admin.service';
import type { IMemberAuthRepository } from './ports/out/member-auth.repository.port';
import type { MemberAuthMailSenderPort } from './ports/out/mail-sender.port';
import type { MemberAuthAdminLookupPort } from './ports/out/member-auth-admin-lookup.port';

describe('MemberAuthAdminService', () => {
  let service: MemberAuthAdminService;
  let adminLookup: jest.Mocked<MemberAuthAdminLookupPort>;
  let memberAuthRepository: jest.Mocked<IMemberAuthRepository>;
  let mailSender: jest.Mocked<MemberAuthMailSenderPort>;
  let loggerErrorSpy: jest.SpiedFunction<(message: unknown) => void>;

  beforeEach(() => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    adminLookup = {
      verifyAdminPassword: jest.fn(),
      findAdminEmails: jest.fn(),
    };

    memberAuthRepository = {
      findAuthByEmail: jest.fn(),
      findAuthByMemberId: jest.fn(),
      isRegisteredEmail: jest.fn(),
      findClubById: jest.fn(),
      findMemberForLogin: jest.fn(),
      signup: jest.fn(),
      updateAuthPermission: jest.fn(),
      updateAuthPassword: jest.fn(),
      updateAuthPasswordByEmail: jest.fn(),
      deleteAuth: jest.fn(),
      findPendingSignupIds: jest.fn(),
      findPendingSignupIdsByClubId: jest.fn(),
      findMembersEmailName: jest.fn(),
    };

    mailSender = {
      sendSignUpAcceptedMail: jest.fn(),
      sendSignUpRequestedMail: jest.fn(),
      sendEmailConfirmMail: jest.fn(),
      sendPasswordModifyMail: jest.fn(),
    };

    service = new MemberAuthAdminService(
      adminLookup,
      memberAuthRepository,
      mailSender,
    );
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  describe('acceptSignUp', () => {
    it('승인 시 권한을 ACCEPTED로 갱신하고 수락 메일을 보낸다', async () => {
      const ids = [1, 2];
      memberAuthRepository.findMembersEmailName.mockResolvedValue([
        { memberId: 1, email: 'a@test.com', name: 'A' },
        { memberId: 2, email: 'b@test.com', name: 'B' },
      ]);
      mailSender.sendSignUpAcceptedMail.mockResolvedValue(undefined);

      await expect(service.acceptSignUp(ids)).resolves.toEqual({
        message: '회원 가입 승인에 성공했습니다.',
      });

      expect(memberAuthRepository.updateAuthPermission).toHaveBeenCalledWith(
        ids,
        'ACCEPTED',
      );
      expect(mailSender.sendSignUpAcceptedMail).toHaveBeenCalledWith(
        'a@test.com',
        'A',
      );
      expect(mailSender.sendSignUpAcceptedMail).toHaveBeenCalledWith(
        'b@test.com',
        'B',
      );
    });

    it('메일 전송이 실패해도 예외를 전파하지 않고 success를 반환한다', async () => {
      memberAuthRepository.findMembersEmailName.mockResolvedValue([
        { memberId: 1, email: 'a@test.com', name: 'A' },
      ]);
      mailSender.sendSignUpAcceptedMail.mockRejectedValue(
        new Error('SMTP error'),
      );

      await expect(service.acceptSignUp([1])).resolves.toEqual({
        message: '회원 가입 승인에 성공했습니다.',
      });
      expect(memberAuthRepository.updateAuthPermission).toHaveBeenCalledWith(
        [1],
        'ACCEPTED',
      );
    });
  });

  describe('sendSignUpRequestMail', () => {
    it('대기 회원 수가 0이면 신청 알림 메일을 보내지 않는다', async () => {
      adminLookup.findAdminEmails.mockResolvedValue([
        { email: 'admin1@test.com' },
      ]);
      memberAuthRepository.findPendingSignupIds.mockResolvedValue([]);

      await service.sendSignUpRequestMail();

      expect(mailSender.sendSignUpRequestedMail).not.toHaveBeenCalled();
    });

    it('대기 회원 수가 있으면 모든 관리자 이메일로 알림을 보낸다', async () => {
      adminLookup.findAdminEmails.mockResolvedValue([
        { email: 'a1@test.com' },
        { email: 'a2@test.com' },
      ]);
      memberAuthRepository.findPendingSignupIds.mockResolvedValue([
        {
          memberId: 1,
          email: 'u@test.com',
          name: 'U',
          nickname: 'n',
          clubName: 'C',
          enrollmentNumber: '01',
        },
        {
          memberId: 2,
          email: 'u2@test.com',
          name: 'U2',
          nickname: 'n2',
          clubName: 'C',
          enrollmentNumber: '02',
        },
      ]);

      await service.sendSignUpRequestMail();

      expect(mailSender.sendSignUpRequestedMail).toHaveBeenCalledWith(
        'a1@test.com',
        2,
      );
      expect(mailSender.sendSignUpRequestedMail).toHaveBeenCalledWith(
        'a2@test.com',
        2,
      );
    });

    it('메일 전송이 실패해도 예외를 전파하지 않는다', async () => {
      adminLookup.findAdminEmails.mockResolvedValue([
        { email: 'admin@test.com' },
      ]);
      memberAuthRepository.findPendingSignupIds.mockResolvedValue([
        {
          memberId: 1,
          email: 'u@test.com',
          name: 'U',
          nickname: 'n',
          clubName: 'C',
          enrollmentNumber: '01',
        },
      ]);
      mailSender.sendSignUpRequestedMail.mockRejectedValue(
        new Error('SMTP error'),
      );

      await expect(service.sendSignUpRequestMail()).resolves.toBeUndefined();
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('forceRemove', () => {
    it('관리자 비밀번호가 틀리면 UnauthorizedException을 던진다', async () => {
      adminLookup.verifyAdminPassword.mockResolvedValue(false);

      await expect(
        service.forceRemove({
          adminId: 1,
          password: 'wrong',
          targetId: 99,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(memberAuthRepository.deleteAuth).not.toHaveBeenCalled();
    });

    it('검증 성공 시 대상 회원을 삭제한다', async () => {
      adminLookup.verifyAdminPassword.mockResolvedValue(true);

      await expect(
        service.forceRemove({
          adminId: 1,
          password: 'ok',
          targetId: 42,
        }),
      ).resolves.toEqual({ message: '회원 탈퇴가 완료되었습니다.' });

      expect(adminLookup.verifyAdminPassword).toHaveBeenCalledWith(1, 'ok');
      expect(memberAuthRepository.deleteAuth).toHaveBeenCalledWith(42);
    });
  });
});
