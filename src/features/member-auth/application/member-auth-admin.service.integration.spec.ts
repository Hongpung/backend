import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { MemberAuthAdminService } from './member-auth-admin.service';
import { MemberAuthPrismaRepository } from '../infrastructure/out/prisma/member-auth.prisma.repository';
import type { MemberAuthAdminLookupPort } from './ports/out/member-auth-admin-lookup.port';
import type { MemberAuthMailSenderPort } from './ports/out/mail-sender.port';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('MemberAuthAdminService (통합)', () => {
  let prisma: PrismaClient;
  let service: MemberAuthAdminService;
  let adminLookup: jest.Mocked<MemberAuthAdminLookupPort>;
  let mailSender: jest.Mocked<MemberAuthMailSenderPort>;

  const runId = Date.now();
  const plainPassword = 'admin-integration-password';

  let testClubId: number;
  let testClubBId: number;
  let pendingClubAMemberId: number;
  let pendingClubBMemberId: number;
  let acceptedMemberId: number;
  let noClubPendingMemberId: number;
  let forceRemoveTargetId: number;

  const seededPendingIds = (): number[] => [
    pendingClubAMemberId,
    pendingClubBMemberId,
    noClubPendingMemberId,
  ];

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();

    adminLookup = {
      verifyAdminPassword: jest.fn(async () => true),
      findAdminEmails: jest.fn(async () => [
        { email: `admin-a-${runId}@integration.test` },
        { email: `admin-b-${runId}@integration.test` },
      ]),
    };

    mailSender = {
      sendSignUpAcceptedMail: jest.fn(async () => undefined),
      sendSignUpRequestedMail: jest.fn(async () => undefined),
      sendEmailConfirmMail: jest.fn(async () => undefined),
      sendPasswordModifyMail: jest.fn(async () => undefined),
    };

    service = new MemberAuthAdminService(
      adminLookup,
      new MemberAuthPrismaRepository(prisma as unknown as PrismaService),
      mailSender,
    );

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 30_000;
    testClubBId = testClubId + 1;

    await prisma.club.createMany({
      data: [
        {
          clubId: testClubId,
          clubName: `member-auth-admin-club-a-${testClubId}`,
          profileImageUrl: null,
        },
        {
          clubId: testClubBId,
          clubName: `member-auth-admin-club-b-${testClubBId}`,
          profileImageUrl: null,
        },
      ],
    });

    const pendingA = await prisma.member.create({
      data: {
        email: `member-auth-admin-pending-a-${runId}@integration.test`,
        password: hashedPassword,
        name: 'A대기회원',
        enrollmentNumber: `member-auth-admin-${runId}-pa`,
        clubId: testClubId,
        nickname: 'A닉네임',
        isPermmited: 'PENDING',
      },
    });
    pendingClubAMemberId = pendingA.memberId;

    const pendingB = await prisma.member.create({
      data: {
        email: `member-auth-admin-pending-b-${runId}@integration.test`,
        password: hashedPassword,
        name: 'B대기회원',
        enrollmentNumber: `member-auth-admin-${runId}-pb`,
        clubId: testClubBId,
        nickname: 'B닉네임',
        isPermmited: 'PENDING',
      },
    });
    pendingClubBMemberId = pendingB.memberId;

    const noClubPending = await prisma.member.create({
      data: {
        email: `member-auth-admin-pending-nc-${runId}@integration.test`,
        password: hashedPassword,
        name: '무소속대기',
        enrollmentNumber: `member-auth-admin-${runId}-nc`,
        clubId: null,
        nickname: null,
        isPermmited: 'PENDING',
      },
    });
    noClubPendingMemberId = noClubPending.memberId;

    const accepted = await prisma.member.create({
      data: {
        email: `member-auth-admin-accepted-${runId}@integration.test`,
        password: hashedPassword,
        name: '승인회원',
        enrollmentNumber: `member-auth-admin-${runId}-ac`,
        clubId: testClubId,
        isPermmited: 'ACCEPTED',
      },
    });
    acceptedMemberId = accepted.memberId;

    const forceRemoveTarget = await prisma.member.create({
      data: {
        email: `member-auth-admin-force-remove-${runId}@integration.test`,
        password: hashedPassword,
        name: '강제탈퇴대상',
        enrollmentNumber: `member-auth-admin-${runId}-fr`,
        clubId: null,
        isPermmited: 'ACCEPTED',
      },
    });
    forceRemoveTargetId = forceRemoveTarget.memberId;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.member.deleteMany({
      where: {
        memberId: {
          in: [
            pendingClubAMemberId,
            pendingClubBMemberId,
            noClubPendingMemberId,
            acceptedMemberId,
            forceRemoveTargetId,
          ],
        },
      },
    });
    await prisma.club.deleteMany({
      where: { clubId: { in: [testClubId, testClubBId] } },
    });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('getPendingSignupList', () => {
    it('PENDING 회원을 SignupListItem으로 매핑하고 ACCEPTED는 제외한다', async () => {
      const result = await service.getPendingSignupList();

      const seeded = result.filter((item) =>
        seededPendingIds().includes(item.signupId),
      );

      expect(seeded).toEqual(
        expect.arrayContaining([
          {
            signupId: pendingClubAMemberId,
            name: 'A대기회원',
            nickname: 'A닉네임',
            club: `member-auth-admin-club-a-${testClubId}`,
            enrollmentNumber: `member-auth-admin-${runId}-pa`,
            email: `member-auth-admin-pending-a-${runId}@integration.test`,
          },
          {
            signupId: pendingClubBMemberId,
            name: 'B대기회원',
            nickname: 'B닉네임',
            club: `member-auth-admin-club-b-${testClubBId}`,
            enrollmentNumber: `member-auth-admin-${runId}-pb`,
            email: `member-auth-admin-pending-b-${runId}@integration.test`,
          },
          {
            signupId: noClubPendingMemberId,
            name: '무소속대기',
            nickname: null,
            club: null,
            enrollmentNumber: `member-auth-admin-${runId}-nc`,
            email: `member-auth-admin-pending-nc-${runId}@integration.test`,
          },
        ]),
      );

      expect(seeded.some((item) => item.signupId === acceptedMemberId)).toBe(
        false,
      );
    });
  });

  describe('getPendingSignupListByClubId', () => {
    it('지정 clubId의 PENDING 회원만 SignupListItem으로 반환한다', async () => {
      const clubAResult = await service.getPendingSignupListByClubId(testClubId);
      const clubBResult = await service.getPendingSignupListByClubId(testClubBId);

      expect(clubAResult).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            signupId: pendingClubAMemberId,
            club: `member-auth-admin-club-a-${testClubId}`,
          }),
        ]),
      );
      expect(
        clubAResult.some((item) => item.signupId === pendingClubBMemberId),
      ).toBe(false);

      expect(clubBResult).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            signupId: pendingClubBMemberId,
            club: `member-auth-admin-club-b-${testClubBId}`,
          }),
        ]),
      );
    });
  });

  describe('acceptSignUp', () => {
    it('DB 상태를 ACCEPTED로 갱신하고 승인 메일을 전송한다', async () => {
      mailSender.sendSignUpAcceptedMail.mockClear();

      const result = await service.acceptSignUp([pendingClubAMemberId]);

      expect(result).toEqual({ message: '회원 가입 승인에 성공했습니다.' });

      const row = await prisma.member.findUnique({
        where: { memberId: pendingClubAMemberId },
        select: { isPermmited: true },
      });
      expect(row?.isPermmited).toBe('ACCEPTED');

      expect(mailSender.sendSignUpAcceptedMail).toHaveBeenCalledWith(
        `member-auth-admin-pending-a-${runId}@integration.test`,
        'A대기회원',
      );

      await prisma.member.update({
        where: { memberId: pendingClubAMemberId },
        data: { isPermmited: 'PENDING' },
      });
    });
  });

  describe('rejectSignUp', () => {
    it('DB 상태를 DENIED로 갱신하고 메일은 보내지 않는다', async () => {
      mailSender.sendSignUpAcceptedMail.mockClear();
      mailSender.sendSignUpRequestedMail.mockClear();

      const result = await service.rejectSignUp([pendingClubBMemberId]);

      expect(result).toEqual({ message: '회원 가입 거절에 성공했습니다.' });

      const row = await prisma.member.findUnique({
        where: { memberId: pendingClubBMemberId },
        select: { isPermmited: true },
      });
      expect(row?.isPermmited).toBe('DENIED');

      expect(mailSender.sendSignUpAcceptedMail).not.toHaveBeenCalled();
      expect(mailSender.sendSignUpRequestedMail).not.toHaveBeenCalled();

      await prisma.member.update({
        where: { memberId: pendingClubBMemberId },
        data: { isPermmited: 'PENDING' },
      });
    });
  });

  describe('sendSignUpRequestMail', () => {
    it('전역 PENDING이 0이면 관리자 메일을 보내지 않는다', async () => {
      const repository = service['memberAuthRepository'] as MemberAuthPrismaRepository;
      const spy = jest
        .spyOn(repository, 'findPendingSignupIds')
        .mockResolvedValueOnce([]);

      mailSender.sendSignUpRequestedMail.mockClear();

      await service.sendSignUpRequestMail();

      expect(mailSender.sendSignUpRequestedMail).not.toHaveBeenCalled();

      spy.mockRestore();
    });

    it('PENDING이 있으면 모든 관리자에게 요청 메일을 보낸다', async () => {
      mailSender.sendSignUpRequestedMail.mockClear();

      await service.sendSignUpRequestMail();

      const pendingCount = (
        await new MemberAuthPrismaRepository(
          prisma as unknown as PrismaService,
        ).findPendingSignupIds()
      ).length;

      expect(pendingCount).toBeGreaterThanOrEqual(seededPendingIds().length);
      expect(mailSender.sendSignUpRequestedMail).toHaveBeenCalledTimes(2);
      expect(mailSender.sendSignUpRequestedMail).toHaveBeenCalledWith(
        `admin-a-${runId}@integration.test`,
        expect.any(Number),
      );
      expect(mailSender.sendSignUpRequestedMail).toHaveBeenCalledWith(
        `admin-b-${runId}@integration.test`,
        expect.any(Number),
      );
    });
  });

  describe('forceRemove', () => {
    it('관리자 비밀번호가 틀리면 UnauthorizedException을 던진다', async () => {
      adminLookup.verifyAdminPassword.mockResolvedValueOnce(false);

      await expect(
        service.forceRemove({
          adminId: 1,
          password: 'wrong-admin-password',
          targetId: forceRemoveTargetId,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(
        await prisma.member.findUnique({
          where: { memberId: forceRemoveTargetId },
        }),
      ).not.toBeNull();
    });

    it('관리자 비밀번호가 맞으면 대상 회원을 삭제한다', async () => {
      adminLookup.verifyAdminPassword.mockResolvedValueOnce(true);

      const result = await service.forceRemove({
        adminId: 1,
        password: plainPassword,
        targetId: forceRemoveTargetId,
      });

      expect(result).toEqual({ message: '회원 탈퇴가 완료되었습니다.' });
      expect(
        await prisma.member.findUnique({
          where: { memberId: forceRemoveTargetId },
        }),
      ).toBeNull();
    });
  });
});
