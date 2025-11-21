import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { MemberLookupService } from 'src/features/member/application/use-case/member-lookup.use-case';
import type { IMemberRepository } from 'src/features/member/application/ports/out/member.repository.port';
import { MemberPrismaRepository } from 'src/features/member/infrastructure/out/prisma/member.prisma.repository';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';
import { ReservationMemberLookupAdapter } from './reservation-member-lookup.adapter';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('ReservationMemberLookupAdapter (통합)', () => {
  let prisma: PrismaClient;
  let memberRepository: MemberPrismaRepository;
  let memberLookupService: MemberLookupService;
  let adapter: ReservationMemberLookupAdapter;

  const runId = Date.now();
  let testClubId: number;
  let creatorMemberId: number;
  let participatorMemberId: number;

  const email = (suffix: string) =>
    `res-member-lookup-int-${runId}-${suffix}@integration.test`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    memberRepository = new MemberPrismaRepository(
      prisma as unknown as PrismaService,
    );
    memberLookupService = new MemberLookupService(
      memberRepository as unknown as IMemberRepository,
    );
    adapter = new ReservationMemberLookupAdapter(memberLookupService);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 41_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `lookup-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const creator = await prisma.member.create({
      data: {
        email: email('creator'),
        password: 'pw',
        name: '룩업생성자',
        nickname: '별명',
        enrollmentNumber: `lookup-int-${runId}-c`,
        clubId: testClubId,
      },
    });
    creatorMemberId = creator.memberId;

    const participator = await prisma.member.create({
      data: {
        email: email('participator'),
        password: 'pw',
        name: '룩업참여자',
        enrollmentNumber: `lookup-int-${runId}-p`,
        clubId: testClubId,
      },
    });
    participatorMemberId = participator.memberId;

    await prisma.roleAssignment.create({
      data: {
        clubId: testClubId,
        memberId: creatorMemberId,
        role: 'LEADER',
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.roleAssignment.deleteMany({ where: { clubId: testClubId } });
    await prisma.member.deleteMany({
      where: {
        memberId: { in: [creatorMemberId, participatorMemberId] },
      },
    });
    await prisma.club.delete({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('loadCreator', () => {
    it('DB 회원을 ReservationCreator로 매핑한다', async () => {
      const creator = await adapter.loadCreator(creatorMemberId);

      expect(creator).toBeInstanceOf(ReservationCreator);
      expect(creator.memberId).toBe(creatorMemberId);
      expect(creator.name).toBe('룩업생성자');
      expect(creator.clubName).toBe(`lookup-int-club-${testClubId}`);
      expect(creator.roles).toContain('LEADER');
    });

    it('존재하지 않는 memberId면 ForbiddenException을 던진다', async () => {
      await expect(adapter.loadCreator(creatorMemberId + 99_999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('loadCreatorAndParticipators', () => {
    it('생성자·참여자 ID를 중복 제거해 조회하고 creator·participators를 반환한다', async () => {
      const result = await adapter.loadCreatorAndParticipators(creatorMemberId, [
        creatorMemberId,
        participatorMemberId,
      ]);

      expect(result.creator.memberId).toBe(creatorMemberId);
      expect(result.participators).toHaveLength(2);
      expect(result.participators[0]).toBeInstanceOf(ReservationParticipator);
      expect(result.participators.map((p) => p.memberId).sort()).toEqual(
        [creatorMemberId, participatorMemberId].sort((a, b) => a - b),
      );
    });

    it('생성자가 조회되지 않으면 ForbiddenException을 던진다', async () => {
      await expect(
        adapter.loadCreatorAndParticipators(creatorMemberId + 99_999, [
          participatorMemberId,
        ]),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('loadParticipatorsById', () => {
    it('빈 ID 목록이면 저장소를 호출하지 않고 빈 배열을 반환한다', async () => {
      const spy = jest.spyOn(memberLookupService, 'findMembersByIds');

      const result = await adapter.loadParticipatorsById([]);

      expect(spy).not.toHaveBeenCalled();
      expect(result).toEqual([]);

      spy.mockRestore();
    });

    it('조회된 회원을 ReservationParticipator 목록으로 반환한다', async () => {
      const participators = await adapter.loadParticipatorsById([
        participatorMemberId,
      ]);

      expect(participators).toHaveLength(1);
      expect(participators[0]).toBeInstanceOf(ReservationParticipator);
      expect(participators[0].memberId).toBe(participatorMemberId);
      expect(participators[0].name).toBe('룩업참여자');
    });
  });
});
