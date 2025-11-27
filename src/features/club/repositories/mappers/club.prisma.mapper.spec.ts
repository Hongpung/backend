import { describe, expect, it } from '@jest/globals';
import type { Prisma } from '@prisma/client';
import { ClubRepositoryMapper } from './club.prisma.mapper';

type ClubWithRelations = Prisma.ClubGetPayload<{
  include: {
    primaryMembers: { include: { member: true } };
    RoleAssignment: { include: { member: true } };
    Instrument: true;
    members: true;
  };
}>;

describe('ClubRepositoryMapper', () => {
  describe('toModel', () => {
    it('동일 멤버의 복수 역할을 members.roleAssignment에 순서대로 집계한다', () => {
      const m1 = {
        memberId: 1,
        email: 'm1@t.com',
        password: 'pw',
        name: '일번',
        nickname: 'n1',
        enrollmentNumber: 'e1',
        clubId: 1,
        profileImageUrl: 'https://p.png',
        instagramUrl: 'https://i.com',
        blogUrl: 'https://b.com',
        pushEnable: false,
        notificationToken: null as string | null,
        isPermmited: 'PENDING' as const,
      };
      const m2 = {
        ...m1,
        memberId: 2,
        email: 'm2@t.com',
        name: '이번',
        nickname: 'n2',
        enrollmentNumber: 'e2',
      };

      const fixture = {
        clubId: 1,
        clubName: '테스트동아리',
        profileImageUrl: null as string | null,
        members: [m1, m2],
        RoleAssignment: [
          {
            roleAssignmentId: 1,
            clubId: 1,
            memberId: 1,
            role: 'LEADER' as const,
            member: m1,
          },
          {
            roleAssignmentId: 2,
            clubId: 1,
            memberId: 1,
            role: 'SANGSOE' as const,
            member: m1,
          },
          {
            roleAssignmentId: 3,
            clubId: 1,
            memberId: 2,
            role: 'SUBUK' as const,
            member: m2,
          },
        ],
        primaryMembers: [],
        Instrument: [],
      } as unknown as ClubWithRelations;

      const model = ClubRepositoryMapper.toModel(fixture);

      const dm1 = model.members!.find((x) => x.memberId === 1)!;
      const dm2 = model.members!.find((x) => x.memberId === 2)!;

      expect(dm1.roleAssignment).toEqual(['LEADER', 'SANGSOE']);
      expect(dm2.roleAssignment).toEqual(['SUBUK']);
    });

    it('primaryMembers.member에도 RoleAssignment 기준 역할 집계를 반영한다', () => {
      const m1 = {
        memberId: 1,
        email: 'm1@t.com',
        password: 'pw',
        name: '일번',
        nickname: 'n1',
        enrollmentNumber: 'e1',
        clubId: 1,
        profileImageUrl: null as string | null,
        instagramUrl: null as string | null,
        blogUrl: null as string | null,
        pushEnable: false,
        notificationToken: null as string | null,
        isPermmited: 'PENDING' as const,
      };

      const fixture = {
        clubId: 1,
        clubName: '테스트동아리',
        profileImageUrl: null,
        members: [m1],
        RoleAssignment: [
          {
            roleAssignmentId: 1,
            clubId: 1,
            memberId: 1,
            role: 'LEADER' as const,
            member: m1,
          },
          {
            roleAssignmentId: 2,
            clubId: 1,
            memberId: 1,
            role: 'SUBUGGU' as const,
            member: m1,
          },
        ],
        primaryMembers: [
          {
            memberId: 1,
            clubId: 1,
            updatedAt: new Date('2024-07-01T00:00:00.000Z'),
            member: m1,
          },
        ],
        Instrument: [],
      } as unknown as ClubWithRelations;

      const model = ClubRepositoryMapper.toModel(fixture);

      expect(model.primaryMembers![0].member.roleAssignment).toEqual([
        'LEADER',
        'SUBUGGU',
      ]);
      expect(model.members![0].roleAssignment).toEqual(['LEADER', 'SUBUGGU']);
    });

    it('멤버·악기의 null URL 필드는 빈 문자열로 정규화한다', () => {
      const m1 = {
        memberId: 1,
        email: 'm1@t.com',
        password: 'pw',
        name: '일번',
        nickname: 'n1',
        enrollmentNumber: 'e1',
        clubId: 1,
        profileImageUrl: null as string | null,
        instagramUrl: null as string | null,
        blogUrl: null as string | null,
        pushEnable: false,
        notificationToken: null as string | null,
        isPermmited: 'PENDING' as const,
      };

      const fixture = {
        clubId: 1,
        clubName: '테스트동아리',
        profileImageUrl: null,
        members: [m1],
        RoleAssignment: [],
        primaryMembers: [],
        Instrument: [
          {
            instrumentId: 99,
            clubId: 1,
            name: '장구',
            instrumentType: 'JANGGU' as const,
            imageUrl: null as string | null,
            borrowAvailable: false,
          },
        ],
      } as unknown as ClubWithRelations;

      const model = ClubRepositoryMapper.toModel(fixture);

      expect(model.members![0].profileImageUrl).toBe('');
      expect(model.members![0].instagramUrl).toBe('');
      expect(model.members![0].blogUrl).toBe('');
      expect(model.instruments![0].imageUrl).toBe('');
      expect(model.instruments![0].instrumentType).toBe('JANGGU');
      expect(model.instruments![0].borrowAvailable).toBe(false);
    });
  });
});
