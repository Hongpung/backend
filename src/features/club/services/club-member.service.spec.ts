import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { ClubMemberService } from './club-member.service';
import type { Club } from '../models/club.model';
import {
  createMember,
  createClub,
  createClubPrimaryMember,
} from '../models/club.model';
import type { IClubRepository } from '../repositories/club.repository.port';

describe('ClubMemberService', () => {
  let service: ClubMemberService;
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
      updateClubProfileImage: jest.fn(),
      replaceClubPrimaryMembers: jest.fn(),
      updateClubRoles: jest.fn(),
      findAllClubs: jest.fn(),
    };

    service = new ClubMemberService(repository);
  });

  describe('getClubInfo', () => {
    it('동아리가 없으면 UnauthorizedException을 던진다', async () => {
      repository.findClubById.mockResolvedValue(null);

      await expect(service.getClubInfo(1)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('getClubMembers', () => {
    it('동아리가 없으면 UnauthorizedException을 던진다', async () => {
      repository.findClubById.mockResolvedValue(null);

      await expect(service.getClubMembers(1)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('getClubInstruments', () => {
    it('동아리가 없으면 UnauthorizedException을 던진다', async () => {
      repository.findClubById.mockResolvedValue(null);

      await expect(service.getClubInstruments(1)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('getClubPrimaryMembers', () => {
    it('동아리가 없으면 UnauthorizedException을 던진다', async () => {
      repository.findClubById.mockResolvedValue(null);

      await expect(service.getClubPrimaryMembers(1)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('주요 멤버가 있으면 저장된 목록을 그대로 반환한다', async () => {
      const m = makeMember(10);
      const pm = createClubPrimaryMember({
        member: m,
        updatedAt: new Date('2024-06-01T00:00:00.000Z'),
      });
      const club = createClub({
        clubId: 1,
        clubName: 'C',
        primaryMembers: [pm],
        members: [],
      });
      repository.findClubById.mockResolvedValue(club);

      await expect(service.getClubPrimaryMembers(1)).resolves.toEqual([pm]);
    });

    it('주요 멤버가 비어 있으면 빈 배열을 반환한다', async () => {
      const club = createClub({
        clubId: 1,
        clubName: 'C',
        primaryMembers: [],
        members: [makeMember(101), makeMember(102)],
      });
      repository.findClubById.mockResolvedValue(club);

      await expect(service.getClubPrimaryMembers(1)).resolves.toEqual([]);
    });
  });
});
