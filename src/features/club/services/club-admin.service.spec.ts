import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ClubAdminService } from './club-admin.service';
import { ClubMemberService } from './club-member.service';
import type { Club } from '../models/club.model';
import { createMember, createClub } from '../models/club.model';
import type { ClubRoleAssignmentInput } from '../models/club.commands';
import type { IClubRepository } from '../repositories/club.repository.port';

describe('ClubAdminService', () => {
  let service: ClubAdminService;
  let repository: jest.Mocked<IClubRepository>;

  const makeMember = (memberId: number) =>
    createMember({
      memberId,
      name: `이름${memberId}`,
      nickname: `닉${memberId}`,
      email: `m${memberId}@test.com`,
      clubName: '테스트동아리',
      enrollmentNumber: String(memberId),
      profileImageUrl: '',
      instagramUrl: '',
      blogUrl: '',
      roleAssignment: [],
    });

  beforeEach(() => {
    repository = {
      findClubById: jest.fn<(clubId: number) => Promise<Club | null>>(),
      findAllClubs: jest.fn<() => Promise<Club[]>>(),
      replaceClubPrimaryMembers:
        jest.fn<(clubId: number, memberIds: number[]) => Promise<void>>(),
      updateClubProfileImage:
        jest.fn<(clubId: number, imageUrl: string | null) => Promise<void>>(),
      updateClubRoles:
        jest.fn<
          (
            clubId: number,
            roleAssignments: ClubRoleAssignmentInput[],
          ) => Promise<void>
        >(),
    };

    const memberService = new ClubMemberService(repository);
    service = new ClubAdminService(memberService, repository);
  });

  describe('updateClubPrimaryMembers', () => {
    it('동아리가 없으면 UnauthorizedException을 던진다', async () => {
      repository.findClubById.mockResolvedValue(null);

      await expect(
        service.updateClubPrimaryMembers(1, [1]),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('멤버 ID가 비어 있으면 BadRequestException을 던진다', async () => {
      const club = createClub({
        clubId: 1,
        clubName: 'C',
        members: [makeMember(1)],
      });
      repository.findClubById.mockResolvedValue(club);

      await expect(
        service.updateClubPrimaryMembers(1, []),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.replaceClubPrimaryMembers).not.toHaveBeenCalled();
    });

    it('중복 ID는 제거한 뒤 replaceClubPrimaryMembers를 호출한다', async () => {
      const club = createClub({
        clubId: 1,
        clubName: 'C',
        members: [makeMember(10), makeMember(20)],
      });
      repository.findClubById.mockResolvedValue(club);

      await service.updateClubPrimaryMembers(1, [20, 10, 20]);

      expect(repository.replaceClubPrimaryMembers).toHaveBeenCalledWith(
        1,
        [20, 10],
      );
    });

    it('동아리 소속이 아닌 멤버가 포함되면 BadRequestException을 던진다', async () => {
      const club = createClub({
        clubId: 1,
        clubName: 'C',
        members: [makeMember(10)],
      });
      repository.findClubById.mockResolvedValue(club);

      await expect(
        service.updateClubPrimaryMembers(1, [10, 99]),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: expect.stringContaining('99'),
        }),
      });
      expect(repository.replaceClubPrimaryMembers).not.toHaveBeenCalled();
    });

    it('유효하면 replaceClubPrimaryMembers를 호출한다', async () => {
      const club = createClub({
        clubId: 1,
        clubName: 'C',
        members: [makeMember(10), makeMember(20)],
      });
      repository.findClubById.mockResolvedValue(club);

      await service.updateClubPrimaryMembers(1, [20]);

      expect(repository.replaceClubPrimaryMembers).toHaveBeenCalledWith(1, [
        20,
      ]);
    });
  });

  describe('updateClubProfile', () => {
    it('동아리가 없으면 UnauthorizedException을 던진다', async () => {
      repository.findClubById.mockResolvedValue(null);

      await expect(
        service.updateClubProfile(1, {
          profileImageUrl: 'https://x.com/a.png',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('profileImageUrl이 undefined면 프로필 이미지 갱신을 호출하지 않는다', async () => {
      const club = createClub({ clubId: 1, clubName: 'C' });
      repository.findClubById.mockResolvedValue(club);

      await service.updateClubProfile(1, {});

      expect(repository.updateClubProfileImage).not.toHaveBeenCalled();
      expect(repository.updateClubRoles).not.toHaveBeenCalled();
    });

    it('profileImageUrl이 있으면 updateClubProfileImage를 호출한다', async () => {
      const club = createClub({ clubId: 1, clubName: 'C' });
      repository.findClubById.mockResolvedValue(club);

      await service.updateClubProfile(1, {
        profileImageUrl: 'https://cdn.test/club.png',
      });

      expect(repository.updateClubProfileImage).toHaveBeenCalledWith(
        1,
        'https://cdn.test/club.png',
      );
      expect(repository.updateClubRoles).not.toHaveBeenCalled();
    });

    it('roleAssignments가 비어 있으면 updateClubRoles를 호출하지 않는다', async () => {
      const club = createClub({ clubId: 1, clubName: 'C' });
      repository.findClubById.mockResolvedValue(club);

      await service.updateClubProfile(1, { roleAssignments: [] });

      expect(repository.updateClubRoles).not.toHaveBeenCalled();
    });

    it('roleAssignments가 있으면 updateClubRoles를 호출한다', async () => {
      const club = createClub({ clubId: 1, clubName: 'C' });
      repository.findClubById.mockResolvedValue(club);
      const assignments = [
        { role: '패짱' as const, userId: 1 as number | null },
      ];

      await service.updateClubProfile(1, { roleAssignments: assignments });

      expect(repository.updateClubRoles).toHaveBeenCalledWith(1, assignments);
    });
  });
});
