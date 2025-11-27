import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import { MemberAuthPrismaRepository } from './member-auth.prisma.repository';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { MemberAuthEntity } from '../../../domain/member-auth.entity';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('MemberAuthPrismaRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: MemberAuthPrismaRepository;

  const runId = Date.now();
  const acceptedEmail = `member-auth-repo-int-accepted-${runId}@integration.test`;
  const pendingEmail = `member-auth-repo-int-pending-${runId}@integration.test`;
  const plainPassword = 'integration-test-password';

  let testClubId: number;
  let testClubBId: number;
  let acceptedMemberId: number;
  let pendingMemberId: number;
  let pendingClubBMemberId: number;
  let acceptedOtherClubMemberId: number;
  let noClubPendingMemberId: number;
  let hashedPassword: string;

  const seededPendingMemberIds = (): number[] => [
    pendingMemberId,
    pendingClubBMemberId,
    noClubPendingMemberId,
  ];

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new MemberAuthPrismaRepository(
      prisma as unknown as PrismaService,
    );

    hashedPassword = await bcrypt.hash(plainPassword, 10);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 10_000;
    testClubBId = testClubId + 1;

    await prisma.club.createMany({
      data: [
        {
          clubId: testClubId,
          clubName: `member-auth-int-club-${testClubId}`,
          profileImageUrl: null,
        },
        {
          clubId: testClubBId,
          clubName: `member-auth-int-club-b-${testClubBId}`,
          profileImageUrl: null,
        },
      ],
    });

    const accepted = await prisma.member.create({
      data: {
        email: acceptedEmail,
        password: hashedPassword,
        name: '승인회원',
        enrollmentNumber: `member-auth-int-${runId}-a`,
        clubId: testClubId,
        isPermmited: 'ACCEPTED',
      },
    });
    acceptedMemberId = accepted.memberId;

    const pending = await prisma.member.create({
      data: {
        email: pendingEmail,
        password: hashedPassword,
        name: '대기회원',
        enrollmentNumber: `member-auth-int-${runId}-p`,
        clubId: testClubId,
        nickname: '대기닉네임',
        isPermmited: 'PENDING',
      },
    });
    pendingMemberId = pending.memberId;

    const pendingClubB = await prisma.member.create({
      data: {
        email: `member-auth-repo-int-pending-b-${runId}@integration.test`,
        password: hashedPassword,
        name: 'B동아리대기',
        enrollmentNumber: `member-auth-int-${runId}-pb`,
        clubId: testClubBId,
        nickname: 'B닉네임',
        isPermmited: 'PENDING',
      },
    });
    pendingClubBMemberId = pendingClubB.memberId;

    const acceptedOther = await prisma.member.create({
      data: {
        email: `member-auth-repo-int-accepted-b-${runId}@integration.test`,
        password: hashedPassword,
        name: 'B동아리승인',
        enrollmentNumber: `member-auth-int-${runId}-ab`,
        clubId: testClubBId,
        isPermmited: 'ACCEPTED',
      },
    });
    acceptedOtherClubMemberId = acceptedOther.memberId;

    const noClubPending = await prisma.member.create({
      data: {
        email: `member-auth-repo-int-pending-noclub-${runId}@integration.test`,
        password: hashedPassword,
        name: '무소속대기',
        enrollmentNumber: `member-auth-int-${runId}-nc`,
        clubId: null,
        nickname: null,
        isPermmited: 'PENDING',
      },
    });
    noClubPendingMemberId = noClubPending.memberId;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.member.deleteMany({
      where: {
        memberId: {
          in: [
            acceptedMemberId,
            pendingMemberId,
            pendingClubBMemberId,
            acceptedOtherClubMemberId,
            noClubPendingMemberId,
          ],
        },
      },
    });
    await prisma.club.deleteMany({
      where: { clubId: { in: [testClubId, testClubBId] } },
    });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('findAuthByEmail', () => {
    it('존재하는 이메일이면 MemberAuthEntity를 반환한다', async () => {
      const entity = await repository.findAuthByEmail(acceptedEmail);

      expect(entity).toBeInstanceOf(MemberAuthEntity);
      expect(entity!.memberId).toBe(acceptedMemberId);
      expect(entity!.email).toBe(acceptedEmail);
      expect(entity!.password).toBe(hashedPassword);
    });

    it('존재하지 않는 이메일이면 null을 반환한다', async () => {
      const entity = await repository.findAuthByEmail(
        `missing-${acceptedEmail}`,
      );
      expect(entity).toBeNull();
    });
  });

  describe('findAuthByMemberId', () => {
    it('memberId로 auth를 조회한다', async () => {
      const entity = await repository.findAuthByMemberId(acceptedMemberId);
      expect(entity?.email).toBe(acceptedEmail);
    });
  });

  describe('isRegisteredEmail', () => {
    it('등록된 이메일이면 true를 반환한다', async () => {
      expect(await repository.isRegisteredEmail(acceptedEmail)).toBe(true);
    });

    it('미등록 이메일이면 false를 반환한다', async () => {
      expect(await repository.isRegisteredEmail(`missing-${acceptedEmail}`)).toBe(
        false,
      );
    });
  });

  describe('findMemberForLogin', () => {
    it('ACCEPTED 회원은 canLogin이 true이다', async () => {
      const info = await repository.findMemberForLogin(acceptedMemberId);
      expect(info).toEqual({ clubId: testClubId, canLogin: true });
    });

    it('PENDING 회원은 canLogin이 false이다', async () => {
      const info = await repository.findMemberForLogin(pendingMemberId);
      expect(info).toEqual({ clubId: testClubId, canLogin: false });
    });

    it('존재하지 않는 memberId면 null을 반환한다', async () => {
      const info = await repository.findMemberForLogin(acceptedMemberId + 99_999);
      expect(info).toBeNull();
    });
  });

  describe('findClubById', () => {
    it('존재하는 clubId면 clubName을 반환한다', async () => {
      const club = await repository.findClubById(testClubId);
      expect(club).toEqual({
        clubId: testClubId,
        clubName: `member-auth-int-club-${testClubId}`,
      });
    });

    it('존재하지 않는 clubId면 null을 반환한다', async () => {
      expect(await repository.findClubById(testClubId + 99_999)).toBeNull();
    });
  });

  describe('signup', () => {
    const signupEmail = `member-auth-repo-signup-${runId}@integration.test`;

    afterAll(async () => {
      await prisma.member.deleteMany({ where: { email: signupEmail } });
    });

    it('PENDING 상태로 회원을 생성한다', async () => {
      await repository.signup({
        email: signupEmail,
        password: hashedPassword,
        name: '가입테스트',
        enrollmentNumber: `member-auth-signup-${runId}`,
        clubId: testClubId,
        nickname: '닉네임',
      });

      const row = await prisma.member.findUnique({
        where: { email: signupEmail },
        select: { isPermmited: true, clubId: true, nickname: true },
      });
      expect(row?.isPermmited).toBe('PENDING');
      expect(row?.clubId).toBe(testClubId);
      expect(row?.nickname).toBe('닉네임');
    });
  });

  describe('updateAuthPassword', () => {
    it('비밀번호 해시를 갱신한다', async () => {
      const newPlain = 'new-integration-password';
      const newHash = await bcrypt.hash(newPlain, 10);

      await repository.updateAuthPassword(acceptedMemberId, newHash);

      const row = await prisma.member.findUnique({
        where: { memberId: acceptedMemberId },
        select: { password: true },
      });
      expect(row?.password).toBe(newHash);
      expect(await bcrypt.compare(newPlain, row!.password)).toBe(true);

      await repository.updateAuthPassword(acceptedMemberId, hashedPassword);
    });
  });

  describe('updateAuthPermission', () => {
    it('여러 memberId의 승인 상태를 일괄 갱신한다', async () => {
      await repository.updateAuthPermission([pendingMemberId], 'ACCEPTED');

      const row = await prisma.member.findUnique({
        where: { memberId: pendingMemberId },
        select: { isPermmited: true },
      });
      expect(row?.isPermmited).toBe('ACCEPTED');

      await prisma.member.update({
        where: { memberId: pendingMemberId },
        data: { isPermmited: 'PENDING' },
      });
    });
  });

  describe('updateAuthPasswordByEmail', () => {
    it('이메일로 비밀번호 해시를 갱신하고 bcrypt로 검증한다', async () => {
      const newPlain = 'email-reset-integration-password';
      const newHash = await bcrypt.hash(newPlain, 10);

      await repository.updateAuthPasswordByEmail(acceptedEmail, newHash);

      const row = await prisma.member.findUnique({
        where: { email: acceptedEmail },
        select: { password: true },
      });
      expect(row?.password).toBe(newHash);
      expect(await bcrypt.compare(newPlain, row!.password)).toBe(true);

      await repository.updateAuthPasswordByEmail(acceptedEmail, hashedPassword);
    });
  });

  describe('deleteAuth', () => {
    it('회원을 삭제하고 연관 refresh token·device도 cascade 제거한다', async () => {
      const disposable = await prisma.member.create({
        data: {
          email: `member-auth-repo-delete-${runId}@integration.test`,
          password: hashedPassword,
          name: '삭제대상',
          enrollmentNumber: `member-auth-delete-${runId}`,
          isPermmited: 'ACCEPTED',
          clubId: null,
        },
      });

      await prisma.memberDevice.create({
        data: {
          memberId: disposable.memberId,
          deviceId: `delete-device-${runId}`,
          deviceName: 'jest',
        },
      });
      await prisma.memberRefreshToken.create({
        data: {
          memberId: disposable.memberId,
          sessionId: `delete-session-${runId}`,
          deviceId: `delete-device-${runId}`,
          tokenHash: `delete-hash-${runId}`,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await repository.deleteAuth(disposable.memberId);

      expect(
        await prisma.member.findUnique({
          where: { memberId: disposable.memberId },
        }),
      ).toBeNull();
      expect(
        await prisma.memberDevice.count({
          where: { memberId: disposable.memberId },
        }),
      ).toBe(0);
      expect(
        await prisma.memberRefreshToken.count({
          where: { memberId: disposable.memberId },
        }),
      ).toBe(0);
    });
  });

  describe('findPendingSignupIds', () => {
    it('PENDING 회원만 반환하고 clubName·nickname을 매핑한다', async () => {
      const result = await repository.findPendingSignupIds();

      const seededIds = seededPendingMemberIds();
      const seededRows = result.filter((row) =>
        seededIds.includes(row.memberId),
      );

      expect(seededRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            memberId: pendingMemberId,
            email: pendingEmail,
            name: '대기회원',
            nickname: '대기닉네임',
            clubName: `member-auth-int-club-${testClubId}`,
            enrollmentNumber: `member-auth-int-${runId}-p`,
          }),
          expect.objectContaining({
            memberId: pendingClubBMemberId,
            clubName: `member-auth-int-club-b-${testClubBId}`,
            nickname: 'B닉네임',
          }),
          expect.objectContaining({
            memberId: noClubPendingMemberId,
            clubName: null,
            nickname: null,
          }),
        ]),
      );

      expect(
        seededRows.some((row) => row.memberId === acceptedMemberId),
      ).toBe(false);
      expect(
        seededRows.some((row) => row.memberId === acceptedOtherClubMemberId),
      ).toBe(false);
    });
  });

  describe('findPendingSignupIdsByClubId', () => {
    it('지정 clubId의 PENDING 회원만 반환한다', async () => {
      const clubAResult = await repository.findPendingSignupIdsByClubId(
        testClubId,
      );
      const clubBResult = await repository.findPendingSignupIdsByClubId(
        testClubBId,
      );

      expect(clubAResult).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            memberId: pendingMemberId,
            clubName: `member-auth-int-club-${testClubId}`,
          }),
        ]),
      );
      expect(
        clubAResult.some((row) => row.memberId === pendingClubBMemberId),
      ).toBe(false);

      expect(clubBResult).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            memberId: pendingClubBMemberId,
            clubName: `member-auth-int-club-b-${testClubBId}`,
          }),
        ]),
      );
      expect(
        clubBResult.some((row) => row.memberId === pendingMemberId),
      ).toBe(false);
    });
  });

  describe('findMembersEmailName', () => {
    it('존재하는 memberId만 email·name으로 반환한다', async () => {
      const missingId = acceptedMemberId + 99_999;
      const result = await repository.findMembersEmailName([
        acceptedMemberId,
        pendingMemberId,
        missingId,
      ]);

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          {
            memberId: acceptedMemberId,
            email: acceptedEmail,
            name: '승인회원',
          },
          {
            memberId: pendingMemberId,
            email: pendingEmail,
            name: '대기회원',
          },
        ]),
      );
      expect(result.some((row) => row.memberId === missingId)).toBe(false);
    });
  });
});
