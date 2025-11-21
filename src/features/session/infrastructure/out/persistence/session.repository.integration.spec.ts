import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { MemberForCheckInWithClubAndRoles } from '../../../application/ports/out/session.repository.port';
import { PrismaSessionRepository } from './session.repository.impl';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('PrismaSessionRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaSessionRepository;

  const runId = Date.now();
  let testClubId: number;
  let memberWithClubId: number;
  let memberWithoutClubId: number;

  const email = (suffix: string) =>
    `session-repo-int-${runId}-${suffix}@integration.test`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new PrismaSessionRepository(
      prisma as unknown as PrismaService,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 42_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `session-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const withClub = await prisma.member.create({
      data: {
        email: email('with-club'),
        password: 'pw',
        name: '체크인회원',
        nickname: '닉네임',
        enrollmentNumber: `session-int-${runId}-wc`,
        clubId: testClubId,
        profileImageUrl: 'https://cdn.test/profile.png',
      },
    });
    memberWithClubId = withClub.memberId;

    const withoutClub = await prisma.member.create({
      data: {
        email: email('no-club'),
        password: 'pw',
        name: '무소속회원',
        enrollmentNumber: `session-int-${runId}-nc`,
        clubId: null,
      },
    });
    memberWithoutClubId = withoutClub.memberId;

    await prisma.roleAssignment.create({
      data: {
        clubId: testClubId,
        memberId: memberWithClubId,
        role: 'SANGSOE',
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.roleAssignment.deleteMany({ where: { clubId: testClubId } });
    await prisma.member.deleteMany({
      where: {
        memberId: { in: [memberWithClubId, memberWithoutClubId] },
      },
    });
    await prisma.club.delete({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('findMemberForCheckIn', () => {
    it('동아리·역할이 있는 회원을 MemberForCheckIn으로 매핑한다', async () => {
      const member = await repository.findMemberForCheckIn(memberWithClubId);

      expect(member).not.toBeNull();
      expect(member!.memberId).toBe(memberWithClubId);
      expect(member!.email).toBe(email('with-club'));
      expect(member!.club).toEqual({
        clubName: `session-int-club-${testClubId}`,
      });
      expect(member!.roleAssignment).toEqual([{ role: 'SANGSOE' }]);
      expect(member!.profileImageUrl).toBe('https://cdn.test/profile.png');
    });

    it('존재하지 않는 memberId면 null을 반환한다', async () => {
      const member = await repository.findMemberForCheckIn(
        memberWithClubId + 99_999,
      );
      expect(member).toBeNull();
    });

    it('clubId가 null이면 club 필드가 null이다', async () => {
      const member = await repository.findMemberForCheckIn(
        memberWithoutClubId,
      );

      expect(member).not.toBeNull();
      expect(member!.memberId).toBe(memberWithoutClubId);
      expect(member!.club).toBeNull();
      expect(member!.roleAssignment).toEqual([]);
    });
  });

  describe('toSessionUserFromCheckInMember', () => {
    it('MemberForCheckIn을 SessionUser로 변환한다', async () => {
      const member = await repository.findMemberForCheckIn(memberWithClubId);
      expect(member).not.toBeNull();
      expect(member!.club).not.toBeNull();

      const sessionUser = repository.toSessionUserFromCheckInMember(
        member as MemberForCheckInWithClubAndRoles,
      );

      expect(sessionUser.memberId).toBe(memberWithClubId);
      expect(sessionUser.club).toBe(`session-int-club-${testClubId}`);
      expect(sessionUser.role).toEqual(['상쇠']);
      expect(sessionUser.nickname).toBe('닉네임');
    });
  });
});
