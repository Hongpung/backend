import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
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

    it('주요 멤버가 비어 있으면 첫 번째 동아리 멤버로 합성하여 반환한다', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-03-15T12:00:00.000Z'));
      try {
        const first = makeMember(101);
        const second = makeMember(102);
        const club = createClub({
          clubId: 1,
          clubName: 'C',
          primaryMembers: [],
          members: [first, second],
        });
        repository.findClubById.mockResolvedValue(club);

        const result = await service.getClubPrimaryMembers(1);

        expect(result).toHaveLength(1);
        expect(result[0].member).toBe(first);
        expect(result[0].updatedAt).toEqual(
          new Date('2025-03-15T12:00:00.000Z'),
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('주요 멤버도 없고 동아리 멤버도 없으면 NotFoundException을 던진다', async () => {
      const club = createClub({
        clubId: 1,
        clubName: 'C',
        primaryMembers: [],
        members: [],
      });
      repository.findClubById.mockResolvedValue(club);

      await expect(service.getClubPrimaryMembers(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
