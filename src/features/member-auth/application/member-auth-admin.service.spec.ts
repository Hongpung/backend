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
    const pendingClubA = {
      memberId: 1,
      email: 'u@test.com',
      name: 'U',
      nickname: 'n',
      clubId: 10,
      clubName: 'C',
      enrollmentNumber: '01',
    };
    const pendingClubB = {
      memberId: 2,
      email: 'u2@test.com',
      name: 'U2',
      nickname: 'n2',
      clubId: 20,
      clubName: 'D',
      enrollmentNumber: '02',
    };
    const pendingNoClub = {
      memberId: 3,
      email: 'u3@test.com',
      name: 'U3',
      nickname: null,
      clubId: null,
      clubName: null,
      enrollmentNumber: '03',
    };

    it('대기 회원 수가 0이면 신청 알림 메일을 보내지 않는다', async () => {
      adminLookup.findAdminEmails.mockResolvedValue([
        { email: 'admin1@test.com', adminLevel: 'SUPER', clubId: null },
      ]);
      memberAuthRepository.findPendingSignupIds.mockResolvedValue([]);

      await service.sendSignUpRequestMail();

      expect(mailSender.sendSignUpRequestedMail).not.toHaveBeenCalled();
    });

    it('SUPER는 전체 대기 건수를, SUB는 자기 동아리 대기 건수만 받는다', async () => {
      adminLookup.findAdminEmails.mockResolvedValue([
        { email: 'super@test.com', adminLevel: 'SUPER', clubId: null },
        { email: 'sub-a@test.com', adminLevel: 'SUB', clubId: 10 },
        { email: 'sub-b@test.com', adminLevel: 'SUB', clubId: 20 },
        { email: 'sub-none@test.com', adminLevel: 'SUB', clubId: null },
        { email: 'sub-empty@test.com', adminLevel: 'SUB', clubId: 30 },
      ]);
      memberAuthRepository.findPendingSignupIds.mockResolvedValue([
        pendingClubA,
        pendingClubB,
        pendingNoClub,
      ]);

      await service.sendSignUpRequestMail();

      expect(mailSender.sendSignUpRequestedMail).toHaveBeenCalledTimes(3);
      expect(mailSender.sendSignUpRequestedMail).toHaveBeenCalledWith(
        'super@test.com',
        3,
      );
      expect(mailSender.sendSignUpRequestedMail).toHaveBeenCalledWith(
        'sub-a@test.com',
        1,
      );
      expect(mailSender.sendSignUpRequestedMail).toHaveBeenCalledWith(
        'sub-b@test.com',
        1,
      );
    });

    it('메일 전송이 실패해도 예외를 전파하지 않는다', async () => {
      adminLookup.findAdminEmails.mockResolvedValue([
        { email: 'admin@test.com', adminLevel: 'SUPER', clubId: null },
      ]);
      memberAuthRepository.findPendingSignupIds.mockResolvedValue([
        pendingClubA,
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
