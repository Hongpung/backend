import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminEntity } from '../domain/admin.entity';
import type { IAdminRepository } from './ports/out/admin.repository.port';

function adminFixture(
  memberId: number,
  adminLevel: 'SUPER' | 'SUB' | null,
): AdminEntity {
  return AdminEntity.create({
    memberId,
    email: `${memberId}@test.com`,
    name: 'n',
    nickname: null,
    enrollmentNumber: String(memberId),
    clubId: null,
    club: null,
    adminLevel,
  });
}

/** Nest HttpException은 response에 { message } 객체 형태로 실린다. 호출은 한 번만 한다. */
async function expectRejectMessage(
  promise: Promise<unknown>,
  ExceptionClass: abstract new (...args: unknown[]) => {
    getResponse(): unknown;
  },
  message: string,
) {
  const err = await promise.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ExceptionClass);
  expect(
    (err as InstanceType<typeof ExceptionClass>).getResponse(),
  ).toMatchObject({ message });
}

describe('관리자 서비스', () => {
  let service: AdminService;
  let repository: jest.Mocked<IAdminRepository>;

  beforeEach(() => {
    repository = {
      findAllAdmins: jest.fn(),
      findAdminLevel: jest.fn(),
      findAdminByMemberId: jest.fn(),
      createAdminLevel: jest.fn(),
      updateAdminLevel: jest.fn(),
      deleteAdminLevel: jest.fn(),
    } as unknown as jest.Mocked<IAdminRepository>;

    service = new AdminService(repository);
  });

  describe('createAdmin', () => {
    it('본인에게 권한을 부여하면 BadRequestException', async () => {
      await expectRejectMessage(
        service.createAdmin(1, 1, 'SUPER'),
        BadRequestException,
        '본인에게 권한을 부여할 수 없습니다.',
      );
      expect(repository.findAdminByMemberId).not.toHaveBeenCalled();
    });

    it('요청자 회원이 없으면 UnauthorizedException', async () => {
      repository.findAdminByMemberId.mockResolvedValueOnce(null);

      await expect(service.createAdmin(10, 2, 'SUPER')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repository.findAdminByMemberId).toHaveBeenCalledWith(10);
    });

    it('요청자가 SUPER가 아니면(SUB) UnauthorizedException', async () => {
      repository.findAdminByMemberId.mockResolvedValueOnce(
        adminFixture(10, 'SUB'),
      );

      await expect(service.createAdmin(10, 2, 'SUPER')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('대상 회원이 없으면 BadRequestException', async () => {
      repository.findAdminByMemberId
        .mockResolvedValueOnce(adminFixture(1, 'SUPER'))
        .mockResolvedValueOnce(null);

      await expectRejectMessage(
        service.createAdmin(1, 99, 'SUB'),
        BadRequestException,
        '해당 유저를 찾을 수 없습니다.',
      );
    });

    it('대상이 이미 관리자이면 BadRequestException', async () => {
      repository.findAdminByMemberId
        .mockResolvedValueOnce(adminFixture(1, 'SUPER'))
        .mockResolvedValueOnce(adminFixture(2, 'SUB'));

      await expectRejectMessage(
        service.createAdmin(1, 2, 'SUPER'),
        BadRequestException,
        '해당 유저는 이미 관리자입니다.',
      );
    });

    it('정상 시 createAdminLevel 호출 후 메시지와 생성된 관리자를 반환한다', async () => {
      const superAdmin = adminFixture(1, 'SUPER');
      const targetBefore = adminFixture(2, null);
      const targetAfter = adminFixture(2, 'SUB');

      repository.findAdminByMemberId
        .mockResolvedValueOnce(superAdmin)
        .mockResolvedValueOnce(targetBefore)
        .mockResolvedValueOnce(targetAfter);
      repository.createAdminLevel.mockResolvedValue(undefined);

      await expect(service.createAdmin(1, 2, 'SUB')).resolves.toEqual({
        message: '관리자 권한이 성공적으로 부여되었습니다.',
        admin: targetAfter,
      });

      expect(repository.createAdminLevel).toHaveBeenCalledWith(2, 'SUB');
      expect(repository.findAdminByMemberId).toHaveBeenCalledTimes(3);
    });
  });

  describe('changeAdminLevel', () => {
    it('본인 권한을 바꾸려 하면 BadRequestException', async () => {
      await expectRejectMessage(
        service.changeAdminLevel(1, 1, 'SUB'),
        BadRequestException,
        '본인의 권한은 수정할 수 없습니다.',
      );
      expect(repository.findAdminByMemberId).not.toHaveBeenCalled();
    });

    it('요청자 회원이 없으면 UnauthorizedException', async () => {
      repository.findAdminByMemberId.mockResolvedValueOnce(null);

      await expect(
        service.changeAdminLevel(10, 2, 'SUB'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('요청자가 SUPER가 아니면(SUB) UnauthorizedException', async () => {
      repository.findAdminByMemberId.mockResolvedValueOnce(
        adminFixture(10, 'SUB'),
      );

      await expect(
        service.changeAdminLevel(10, 2, 'SUPER'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('변경 후 재조회가 null이면 UnauthorizedException', async () => {
      repository.findAdminByMemberId
        .mockResolvedValueOnce(adminFixture(1, 'SUPER'))
        .mockResolvedValueOnce(null);

      await expectRejectMessage(
        service.changeAdminLevel(1, 2, 'SUB'),
        UnauthorizedException,
        '변경된 관리자를 찾을 수 없습니다.',
      );
      expect(repository.updateAdminLevel).toHaveBeenCalledWith(2, 'SUB');
    });

    it('정상 시 updateAdminLevel 호출 후 메시지와 변경된 관리자를 반환한다', async () => {
      const updated = adminFixture(2, 'SUPER');
      repository.findAdminByMemberId
        .mockResolvedValueOnce(adminFixture(1, 'SUPER'))
        .mockResolvedValueOnce(updated);
      repository.updateAdminLevel.mockResolvedValue(undefined);

      await expect(service.changeAdminLevel(1, 2, 'SUPER')).resolves.toEqual({
        message: '관리자 권한이 성공적으로 변경되었습니다.',
        admin: updated,
      });
      expect(repository.updateAdminLevel).toHaveBeenCalledWith(2, 'SUPER');
    });
  });

  describe('deleteAdminLevel', () => {
    it('본인 권한을 삭제하려 하면 BadRequestException', async () => {
      await expectRejectMessage(
        service.deleteAdminLevel(1, 1),
        BadRequestException,
        '본인의 권한은 수정할 수 없습니다.',
      );
      expect(repository.findAdminByMemberId).not.toHaveBeenCalled();
    });

    it('요청자 회원이 없으면 UnauthorizedException', async () => {
      repository.findAdminByMemberId.mockResolvedValueOnce(null);

      await expect(service.deleteAdminLevel(10, 2)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('요청자가 SUPER가 아니면(SUB) UnauthorizedException', async () => {
      repository.findAdminByMemberId.mockResolvedValueOnce(
        adminFixture(10, 'SUB'),
      );

      await expect(service.deleteAdminLevel(10, 2)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('대상 관리자가 없으면 UnauthorizedException', async () => {
      repository.findAdminByMemberId
        .mockResolvedValueOnce(adminFixture(1, 'SUPER'))
        .mockResolvedValueOnce(null);

      await expectRejectMessage(
        service.deleteAdminLevel(1, 99),
        UnauthorizedException,
        '관리자를 찾을 수 없습니다.',
      );
      expect(repository.deleteAdminLevel).not.toHaveBeenCalled();
    });

    it('정상 시 삭제 전 스냅샷 관리자와 메시지를 반환하고 deleteAdminLevel을 호출한다', async () => {
      const targetSnapshot = adminFixture(2, 'SUB');
      repository.findAdminByMemberId
        .mockResolvedValueOnce(adminFixture(1, 'SUPER'))
        .mockResolvedValueOnce(targetSnapshot);
      repository.deleteAdminLevel.mockResolvedValue(undefined);

      await expect(service.deleteAdminLevel(1, 2)).resolves.toEqual({
        message: '관리자 권한이 성공적으로 삭제되었습니다.',
        admin: targetSnapshot,
      });
      expect(repository.deleteAdminLevel).toHaveBeenCalledWith(2);
    });
  });
});
