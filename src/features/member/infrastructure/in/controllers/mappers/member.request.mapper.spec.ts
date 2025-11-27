import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { MemberRequestMapper } from './member.request.mapper';

describe('MemberRequestMapper', () => {
  describe('toMemberSearchPaginatedParams', () => {
    it('유효하지 않은 role이면 BadRequestException을 던진다', () => {
      expect(() =>
        MemberRequestMapper.toMemberSearchPaginatedParams({
          role: '외계인',
        }),
      ).toThrow(BadRequestException);
    });

    it('허용되지 않은 pageSize이면 BadRequestException이다', () => {
      expect(() =>
        MemberRequestMapper.toMemberSearchPaginatedParams({ pageSize: 99 }),
      ).toThrow(BadRequestException);
      expect(() =>
        MemberRequestMapper.toMemberSearchPaginatedParams({ pageSize: 99 }),
      ).toThrow(/pageSize must be one of/);
    });

    it('유효한 역할과 pageSize면 그대로 반영한다', () => {
      const r = MemberRequestMapper.toMemberSearchPaginatedParams({
        role: '패짱',
        pageSize: 10,
      });
      expect(r.role).toBe('패짱');
      expect(r.pageSize).toBe(10);
    });

    it('clubId가 0이면 필터 값으로 0을 유지한다', () => {
      const r = MemberRequestMapper.toMemberSearchPaginatedParams({
        clubId: 0,
      });
      expect(r.clubId).toBe(0);
    });
  });

  describe('toInviteSearchParams', () => {
    it('clubId 문자열 배열을 숫자 배열로 변환한다', () => {
      const r = MemberRequestMapper.toInviteSearchParams(5, {
        clubId: ['1', '2'],
      });

      expect(r.memberId).toBe(5);
      expect(r.params.clubIds).toEqual([1, 2]);
    });

    it('clubId가 없으면 clubIds는 undefined이다', () => {
      const r = MemberRequestMapper.toInviteSearchParams(9, {});
      expect(r.params.clubIds).toBeUndefined();
    });
  });
});
