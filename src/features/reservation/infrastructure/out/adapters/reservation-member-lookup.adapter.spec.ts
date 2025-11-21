import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import type { MemberLookupReadModel } from 'src/features/member/application/ports/in/member-lookup.read-model';
import { MemberLookupUseCase } from 'src/features/member/application/ports/in/member-lookup.use-case';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';
import { ReservationMemberLookupAdapter } from './reservation-member-lookup.adapter';

function createReadModel(memberId: number): MemberLookupReadModel {
  return {
    memberId,
    name: `회원${memberId}`,
    nickname: '별명',
    enrollmentNumber: '2021000001',
    email: `m${memberId}@test.com`,
    clubName: '동아리A',
    roles: ['LEADER'],
    profileImageUrl: null,
    blogUrl: null,
    instagramUrl: null,
    notificationToken: null,
  };
}

describe('ReservationMemberLookupAdapter', () => {
  let memberLookupUseCase: jest.Mocked<MemberLookupUseCase>;
  let adapter: ReservationMemberLookupAdapter;

  beforeEach(() => {
    memberLookupUseCase = {
      findMembersByIds: jest.fn(),
      findMemberByMemberId: jest.fn(),
      existsMember: jest.fn(),
    } as unknown as jest.Mocked<MemberLookupUseCase>;
    adapter = new ReservationMemberLookupAdapter(memberLookupUseCase);
  });

  describe('loadCreator', () => {
    it('조회된 회원을 ReservationCreator로 반환한다', async () => {
      const member = createReadModel(42);
      memberLookupUseCase.findMembersByIds.mockResolvedValue([member]);

      const result = await adapter.loadCreator(42);

      expect(memberLookupUseCase.findMembersByIds).toHaveBeenCalledWith([42]);
      expect(result).toBeInstanceOf(ReservationCreator);
      expect(result.memberId).toBe(42);
      expect(result.name).toBe('회원42');
    });

    it('생성자가 없으면 ForbiddenException을 던진다', async () => {
      memberLookupUseCase.findMembersByIds.mockResolvedValue([]);

      await expect(adapter.loadCreator(99)).rejects.toThrow(ForbiddenException);
      await expect(adapter.loadCreator(99)).rejects.toThrow(
        '생성자 정보를 찾을 수 없습니다.',
      );
    });
  });

  describe('loadCreatorAndParticipators', () => {
    it('생성자·참여자 ID를 중복 제거해 조회하고 creator·participators를 반환한다', async () => {
      const creator = createReadModel(1);
      const participator = createReadModel(2);
      memberLookupUseCase.findMembersByIds.mockResolvedValue([
        creator,
        participator,
      ]);

      const result = await adapter.loadCreatorAndParticipators(1, [1, 2]);

      expect(memberLookupUseCase.findMembersByIds).toHaveBeenCalledWith([1, 2]);
      expect(result.creator.memberId).toBe(1);
      expect(result.participators).toHaveLength(2);
      expect(result.participators[0]).toBeInstanceOf(ReservationParticipator);
      expect(result.participators.map((p) => p.memberId)).toEqual([1, 2]);
    });

    it('생성자가 없으면 ForbiddenException을 던진다', async () => {
      memberLookupUseCase.findMembersByIds.mockResolvedValue([createReadModel(2)]);

      await expect(
        adapter.loadCreatorAndParticipators(99, [2]),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('loadParticipatorsById', () => {
    it('빈 ID 목록이면 저장소를 호출하지 않고 빈 배열을 반환한다', async () => {
      const result = await adapter.loadParticipatorsById([]);

      expect(memberLookupUseCase.findMembersByIds).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('조회된 회원을 ReservationParticipator 목록으로 반환한다', async () => {
      const member = createReadModel(7);
      memberLookupUseCase.findMembersByIds.mockResolvedValue([member]);

      const result = await adapter.loadParticipatorsById([7]);

      expect(memberLookupUseCase.findMembersByIds).toHaveBeenCalledWith([7]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ReservationParticipator);
      expect(result[0].memberId).toBe(7);
    });
  });
});
