import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { MemberRoleService } from './member-role.service';
import { MemberEntity } from '../domain/member.entity';
import type {
  IMemberRepository,
  TransactionContext,
} from './ports/out/member.repository.port';

function memberWithClub(memberId: number, clubId: number) {
  return MemberEntity.create({
    memberId,
    name: 'U',
    nickname: null,
    enrollmentNumber: '2021000001',
    email: 'u@test.com',
    clubId,
    club: { clubId, clubName: 'C' },
    roleAssignment: [],
    isPermmited: 'ACCEPTED',
    profileImageUrl: null,
    instagramUrl: null,
    blogUrl: null,
  });
}

describe('MemberRoleService', () => {
  let service: MemberRoleService;
  let repository: jest.Mocked<IMemberRepository>;

  beforeEach(() => {
    repository = {
      findMemberByMemberId: jest.fn(),
      transaction: jest.fn(
        async <T>(cb: (tx: TransactionContext) => Promise<T>): Promise<T> =>
          cb({}),
      ),
      deleteRoleAssignments: jest.fn(),
      findRoleAssignmentIdByRoleAndClub: jest.fn(),
      updateRoleAssignment: jest.fn(),
      createRoleAssignment: jest.fn(),
    } as unknown as jest.Mocked<IMemberRepository>;

    service = new MemberRoleService(repository);
  });

  it('멤버가 없으면 BadRequestException', async () => {
    repository.findMemberByMemberId.mockResolvedValue(null);

    await expect(service.assignRole(1, ['패짱'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('동아리가 없으면 BadRequestException', async () => {
    const m = MemberEntity.create({
      memberId: 1,
      name: 'U',
      nickname: null,
      enrollmentNumber: '2021000001',
      email: 'u@test.com',
      clubId: null,
      club: null,
      roleAssignment: [],
      isPermmited: 'ACCEPTED',
      profileImageUrl: null,
      instagramUrl: null,
      blogUrl: null,
    });
    repository.findMemberByMemberId.mockResolvedValue(m);

    await expect(service.assignRole(1, ['패짱'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('트랜잭션 안에서 역할 삭제 후 기존 row가 있으면 update, 없으면 create 순서대로 처리한다', async () => {
    repository.findMemberByMemberId.mockResolvedValue(memberWithClub(7, 100));
    repository.findRoleAssignmentIdByRoleAndClub
      .mockResolvedValueOnce(11)
      .mockResolvedValueOnce(null);

    const order: string[] = [];
    repository.deleteRoleAssignments.mockImplementation(async () => {
      order.push('delete');
    });
    repository.updateRoleAssignment.mockImplementation(async () => {
      order.push('update');
    });
    repository.createRoleAssignment.mockImplementation(async () => {
      order.push('create');
    });

    await expect(service.assignRole(7, ['패짱', '상쇠'])).resolves.toEqual({
      message: '역할 배정이 완료되었어요.',
    });

    expect(repository.transaction).toHaveBeenCalled();
    expect(order).toEqual(['delete', 'update', 'create']);
    expect(repository.deleteRoleAssignments).toHaveBeenCalledWith(
      7,
      100,
      expect.anything(),
    );
    expect(repository.updateRoleAssignment).toHaveBeenCalledWith(
      11,
      7,
      expect.anything(),
    );
    expect(repository.createRoleAssignment).toHaveBeenCalledWith(
      { clubId: 100, memberId: 7, role: 'SANGSOE' },
      expect.anything(),
    );
  });

  it('transaction이 실패하면 InternalServerErrorException', async () => {
    repository.findMemberByMemberId.mockResolvedValue(memberWithClub(8, 200));
    repository.transaction.mockRejectedValue(new Error('db'));

    await expect(service.assignRole(8, ['패짱'])).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
