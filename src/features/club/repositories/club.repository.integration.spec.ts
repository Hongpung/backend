import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import { ClubRepository } from './club.repository';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('ClubRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: ClubRepository;
  let testClubId: number;
  let secondClubId: number;
  let memberId1: number;
  let memberId2: number;
  let secondClubMemberId: number;
  let instrumentId: number;

  const email = (clubId: number, n: number) =>
    `club-repo-int-${clubId}-m${n}@integration.test`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new ClubRepository(prisma as unknown as PrismaService);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 10_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `통합테스트동아리-${testClubId}`,
        profileImageUrl: null,
      },
    });

    secondClubId = testClubId + 1;

    await prisma.club.create({
      data: {
        clubId: secondClubId,
        clubName: `통합테스트동아리2-${secondClubId}`,
        profileImageUrl: null,
      },
    });

    const m1 = await prisma.member.create({
      data: {
        email: email(testClubId, 1),
        password: 'pw',
        name: '통합멤버1',
        enrollmentNumber: `int-${testClubId}-1`,
        clubId: testClubId,
      },
    });
    const m2 = await prisma.member.create({
      data: {
        email: email(testClubId, 2),
        password: 'pw',
        name: '통합멤버2',
        enrollmentNumber: `int-${testClubId}-2`,
        clubId: testClubId,
      },
    });
    const secondMember = await prisma.member.create({
      data: {
        email: email(secondClubId, 1),
        password: 'pw',
        name: '두번째동아리멤버',
        enrollmentNumber: `int-${secondClubId}-1`,
        clubId: secondClubId,
      },
    });

    memberId1 = m1.memberId;
    memberId2 = m2.memberId;
    secondClubMemberId = secondMember.memberId;

    await prisma.roleAssignment.createMany({
      data: [
        { clubId: testClubId, role: 'LEADER', memberId: memberId1 },
        { clubId: testClubId, role: 'SANGSOE', memberId: memberId2 },
      ],
    });

    await prisma.clubPrimaryMember.create({
      data: { clubId: testClubId, memberId: memberId1 },
    });

    const instrument = await prisma.instrument.create({
      data: {
        clubId: testClubId,
        name: '통합테스트악기',
        instrumentType: 'JANGGU',
        imageUrl: null,
        borrowAvailable: true,
      },
    });
    instrumentId = instrument.instrumentId;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.instrument.deleteMany({
      where: { clubId: { in: [testClubId, secondClubId] } },
    });
    await prisma.clubPrimaryMember.deleteMany({
      where: { clubId: { in: [testClubId, secondClubId] } },
    });
    await prisma.roleAssignment.deleteMany({
      where: { clubId: { in: [testClubId, secondClubId] } },
    });
    await prisma.member.deleteMany({
      where: {
        memberId: { in: [memberId1, memberId2, secondClubMemberId] },
      },
    });
    await prisma.club.deleteMany({
      where: { clubId: { in: [testClubId, secondClubId] } },
    });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('findClubById', () => {
    it('존재하지 않는 clubId면 null을 반환한다', async () => {
      const result = await repository.findClubById(testClubId + 99_999);
      expect(result).toBeNull();
    });

    it('동아리와 members 관계를 모델로 매핑해 반환한다', async () => {
      const club = await repository.findClubById(testClubId);

      expect(club).not.toBeNull();
      expect(club!.clubId).toBe(testClubId);
      expect(club!.members).toHaveLength(2);
      expect(club!.members!.map((m) => m.memberId).sort()).toEqual(
        [memberId1, memberId2].sort(),
      );
    });
  });

  describe('updateClubProfileImage', () => {
    it('profileImageUrl을 갱신한다', async () => {
      const url = 'https://cdn.test/integration-club.png';
      await repository.updateClubProfileImage(testClubId, url);

      const row = await prisma.club.findUnique({
        where: { clubId: testClubId },
        select: { profileImageUrl: true },
      });
      expect(row?.profileImageUrl).toBe(url);

      await repository.updateClubProfileImage(testClubId, null);
    });
  });

  describe('replaceClubPrimaryMembers', () => {
    it('기존 primary를 삭제하고 새 memberIds로 교체한다', async () => {
      await repository.replaceClubPrimaryMembers(testClubId, [memberId1]);

      let rows = await prisma.clubPrimaryMember.findMany({
        where: { clubId: testClubId },
        orderBy: { memberId: 'asc' },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].memberId).toBe(memberId1);

      await repository.replaceClubPrimaryMembers(testClubId, [
        memberId2,
        memberId1,
      ]);

      rows = await prisma.clubPrimaryMember.findMany({
        where: { clubId: testClubId },
        orderBy: { memberId: 'asc' },
      });
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.memberId)).toEqual(
        [memberId1, memberId2].sort((a, b) => a - b),
      );
    });

    it('memberIds가 비어 있으면 deleteMany만 수행한다', async () => {
      await repository.replaceClubPrimaryMembers(testClubId, [memberId1]);
      await repository.replaceClubPrimaryMembers(testClubId, []);

      const rows = await prisma.clubPrimaryMember.findMany({
        where: { clubId: testClubId },
      });
      expect(rows).toHaveLength(0);
    });

    it('findClubById로 primaryMembers.member을 include해 반환한다', async () => {
      await repository.replaceClubPrimaryMembers(testClubId, [memberId2]);

      const club = await repository.findClubById(testClubId);
      expect(club!.primaryMembers).toHaveLength(1);
      expect(club!.primaryMembers![0].member.memberId).toBe(memberId2);
    });
  });

  describe('updateClubRoles', () => {
    it('역할을 upsert하고 userId null이면 해당 역할 배정을 삭제한다', async () => {
      await repository.updateClubRoles(testClubId, [
        { role: '패짱', userId: memberId1 },
        { role: '상쇠', userId: memberId2 },
      ]);

      let assignments = await prisma.roleAssignment.findMany({
        where: { clubId: testClubId },
        orderBy: { role: 'asc' },
      });
      expect(assignments).toHaveLength(2);

      await repository.updateClubRoles(testClubId, [
        { role: '패짱', userId: memberId2 },
      ]);

      assignments = await prisma.roleAssignment.findMany({
        where: { clubId: testClubId },
      });
      const leader = assignments.find((a) => a.role === 'LEADER');
      expect(leader?.memberId).toBe(memberId2);

      await repository.updateClubRoles(testClubId, [
        { role: '상쇠', userId: null },
      ]);

      assignments = await prisma.roleAssignment.findMany({
        where: { clubId: testClubId },
      });
      expect(assignments.some((a) => a.role === 'SANGSOE')).toBe(false);
      expect(assignments).toHaveLength(1);
    });
  });

  describe('findAllClubs', () => {
    beforeEach(async () => {
      await prisma.roleAssignment.deleteMany({ where: { clubId: testClubId } });
      await prisma.roleAssignment.createMany({
        data: [
          { clubId: testClubId, role: 'LEADER', memberId: memberId1 },
          { clubId: testClubId, role: 'SANGSOE', memberId: memberId2 },
        ],
      });
      await prisma.clubPrimaryMember.deleteMany({
        where: { clubId: testClubId },
      });
      await prisma.clubPrimaryMember.create({
        data: { clubId: testClubId, memberId: memberId1 },
      });
    });

    const filterSeededClubs = <T extends { clubId: number }>(clubs: T[]) =>
      clubs
        .filter((c) => [testClubId, secondClubId].includes(c.clubId))
        .sort((a, b) => a.clubId - b.clubId);

    it('시드된 여러 동아리가 clubId/clubName/profileImageUrl로 매핑된다', async () => {
      const clubs = filterSeededClubs(await repository.findAllClubs());

      expect(clubs).toHaveLength(2);
      expect(clubs[0].clubId).toBe(testClubId);
      expect(clubs[0].clubName).toBe(`통합테스트동아리-${testClubId}`);
      expect(clubs[0].profileImageUrl).toBeNull();
      expect(clubs[1].clubId).toBe(secondClubId);
      expect(clubs[1].clubName).toBe(`통합테스트동아리2-${secondClubId}`);
      expect(clubs[1].profileImageUrl).toBeNull();
    });

    it('members, roleAssignment, primaryMembers 관계가 매핑된다', async () => {
      const club = (await repository.findAllClubs()).find(
        (c) => c.clubId === testClubId,
      );

      expect(club).toBeDefined();
      expect(club!.members).toHaveLength(2);
      expect(club!.members!.map((m) => m.memberId).sort()).toEqual(
        [memberId1, memberId2].sort(),
      );

      expect(club!.roleAssignment).toHaveLength(2);
      expect(club!.roleAssignment!.map((r) => r.role).sort()).toEqual([
        'LEADER',
        'SANGSOE',
      ]);
      expect(
        club!.roleAssignment!.find((r) => r.role === 'LEADER')!.member.memberId,
      ).toBe(memberId1);

      expect(club!.primaryMembers).toHaveLength(1);
      expect(club!.primaryMembers![0].member.memberId).toBe(memberId1);
    });

    it('imageUrl이 null인 악기는 빈 문자열로 매핑된다', async () => {
      const club = (await repository.findAllClubs()).find(
        (c) => c.clubId === testClubId,
      );

      expect(club!.instruments).toHaveLength(1);
      expect(club!.instruments![0].instrumentId).toBe(instrumentId);
      expect(club!.instruments![0].name).toBe('통합테스트악기');
      expect(club!.instruments![0].imageUrl).toBe('');
    });
  });
});
