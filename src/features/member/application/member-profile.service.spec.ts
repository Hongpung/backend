import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MemberProfileService } from './member-profile.service';
import { MemberEntity } from '../domain/member.entity';
import type { IMemberRepository } from './ports/out/member.repository.port';
import type { IMemberAdminAuthPort } from './ports/out/member-admin-auth.port';

describe('MemberProfileService', () => {
  let service: MemberProfileService;
  let repository: jest.Mocked<IMemberRepository>;
  let memberAdminAuth: jest.Mocked<IMemberAdminAuthPort>;

  function memberFixture(
    overrides?: Partial<{ email: string; clubId: number | null }>,
  ) {
    const { email = 'user@test.com', clubId = 1 } = overrides ?? {};
    return MemberEntity.create({
      memberId: 10,
      name: '대상',
      nickname: null,
      enrollmentNumber: '2024000001',
      email,
      clubId,
      club: clubId ? { clubId, clubName: 'C' } : null,
      roleAssignment: [],
      isPermmited: 'ACCEPTED',
      profileImageUrl: null,
      instagramUrl: null,
      blogUrl: null,
    });
  }

  beforeEach(() => {
    repository = {
      findMemberByMemberId: jest.fn(),
      updateMemberProfile: jest.fn(),
    } as unknown as jest.Mocked<IMemberRepository>;

    memberAdminAuth = {
      verifyAdminPassword: jest.fn(),
    } as unknown as jest.Mocked<IMemberAdminAuthPort>;

    service = new MemberProfileService(repository, memberAdminAuth);
  });

  describe('getMyStatus', () => {
    it('멤버가 없으면 NotFoundException을 던진다', async () => {
      repository.findMemberByMemberId.mockResolvedValue(null);

      await expect(service.getMyStatus(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('멤버가 있으면 엔티티를 반환한다', async () => {
      const m = memberFixture();
      repository.findMemberByMemberId.mockResolvedValue(m);

      await expect(service.getMyStatus(10)).resolves.toBe(m);
    });
  });

  describe('updateMyStatus', () => {
    it('멤버가 없으면 NotFoundException을 던진다', async () => {
      repository.findMemberByMemberId.mockResolvedValue(null);

      await expect(
        service.updateMyStatus(1, { nickname: 'n' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.updateMemberProfile).not.toHaveBeenCalled();
    });

    it('성공 시 repository.updateMemberProfile을 호출한다', async () => {
      const m = memberFixture();
      const updated = memberFixture();
      repository.findMemberByMemberId.mockResolvedValue(m);
      repository.updateMemberProfile.mockResolvedValue(updated);

      await expect(
        service.updateMyStatus(10, { nickname: '새닉' }),
      ).resolves.toBe(updated);
      expect(repository.updateMemberProfile).toHaveBeenCalledWith(10, {
        nickname: '새닉',
      });
    });
  });

  describe('updateMemberByAdmin', () => {
    it('대상 멤버가 없으면 NotFoundException을 던진다', async () => {
      repository.findMemberByMemberId.mockResolvedValue(null);

      await expect(
        service.updateMemberByAdmin(1, 10, { nickname: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('nickname·name·clubId·email 모두 미지정이면 BadRequestException', async () => {
      repository.findMemberByMemberId.mockResolvedValue(memberFixture());

      await expect(
        service.updateMemberByAdmin(1, 10, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('name이 공백만이면 BadRequestException', async () => {
      repository.findMemberByMemberId.mockResolvedValue(memberFixture());

      await expect(
        service.updateMemberByAdmin(1, 10, { name: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('이메일이 실질 변경될 때 adminPassword 없으면 BadRequestException', async () => {
      repository.findMemberByMemberId.mockResolvedValue(
        memberFixture({ email: 'old@test.com' }),
      );

      await expect(
        service.updateMemberByAdmin(1, 10, { email: 'new@test.com' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(memberAdminAuth.verifyAdminPassword).not.toHaveBeenCalled();
    });

    it('clubId가 실질 변경될 때 adminPassword 없으면 BadRequestException', async () => {
      repository.findMemberByMemberId.mockResolvedValue(
        memberFixture({ clubId: 1 }),
      );

      await expect(
        service.updateMemberByAdmin(1, 10, { clubId: 2 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('이메일 대소문자만 다르면 동일 이메일로 취급하여 비밀번호 검증을 하지 않는다', async () => {
      const exists = memberFixture({ email: 'User@Test.COM' });
      const updated = memberFixture({ email: 'user@test.com' });
      repository.findMemberByMemberId.mockResolvedValue(exists);
      repository.updateMemberProfile.mockResolvedValue(updated);

      await expect(
        service.updateMemberByAdmin(1, 10, {
          email: 'user@test.com',
        }),
      ).resolves.toBe(updated);

      expect(memberAdminAuth.verifyAdminPassword).not.toHaveBeenCalled();
      expect(repository.updateMemberProfile).toHaveBeenCalledWith(10, {
        email: 'user@test.com',
      });
    });

    it('clubId가 동일하면 비밀번호 검증 없이 갱신한다', async () => {
      const exists = memberFixture({ clubId: 5 });
      const updated = memberFixture({ clubId: 5 });
      repository.findMemberByMemberId.mockResolvedValue(exists);
      repository.updateMemberProfile.mockResolvedValue(updated);

      await expect(
        service.updateMemberByAdmin(1, 10, { clubId: 5, nickname: 'a' }),
      ).resolves.toBe(updated);

      expect(memberAdminAuth.verifyAdminPassword).not.toHaveBeenCalled();
    });

    it('verifyAdminPassword가 false면 UnauthorizedException', async () => {
      repository.findMemberByMemberId.mockResolvedValue(
        memberFixture({ email: 'a@a.com' }),
      );
      memberAdminAuth.verifyAdminPassword.mockResolvedValue(false);

      await expect(
        service.updateMemberByAdmin(1, 10, {
          email: 'b@b.com',
          adminPassword: 'pw',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repository.updateMemberProfile).not.toHaveBeenCalled();
    });

    it('저장 시 adminPassword는 저장소 인자에 포함되지 않는다', async () => {
      repository.findMemberByMemberId.mockResolvedValue(
        memberFixture({ email: 'a@a.com', clubId: 1 }),
      );
      memberAdminAuth.verifyAdminPassword.mockResolvedValue(true);
      const updated = memberFixture();
      repository.updateMemberProfile.mockResolvedValue(updated);

      await service.updateMemberByAdmin(99, 10, {
        email: '  z@z.com  ',
        name: '  이름  ',
        adminPassword: 'secret',
      });

      expect(repository.updateMemberProfile).toHaveBeenCalledWith(10, {
        email: 'z@z.com',
        name: '이름',
      });
      expect(
        (repository.updateMemberProfile.mock.calls[0][1] as object)[
          'adminPassword' as never
        ],
      ).toBeUndefined();
    });
  });
});
