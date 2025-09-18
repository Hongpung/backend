import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { AdminEntity } from '../domain/admin.entity';
import {
  AdminRepositoryPort,
  IAdminRepository,
} from './ports/out/admin.repository.port';
import {
  AdminUseCasePort,
  AdminResultWithMessage,
} from './ports/in/admin.use-case.port';

@Injectable()
export class AdminService implements AdminUseCasePort {
  constructor(
    @Inject(AdminRepositoryPort)
    private readonly adminRepository: IAdminRepository,
  ) {}

  async getAdmins(): Promise<AdminEntity[]> {
    return this.adminRepository.findAllAdmins();
  }

  async createAdmin(
    requestAdminId: number,
    targetId: number,
    adminLevel: 'SUPER' | 'SUB',
  ): Promise<AdminResultWithMessage> {
    if (requestAdminId === targetId) {
      throw new BadRequestException('본인에게 권한을 부여할 수 없습니다.');
    }

    const requestAdmin =
      await this.adminRepository.findAdminByMemberId(requestAdminId);
    if (!requestAdmin || !requestAdmin.isSuperAdmin()) {
      throw new UnauthorizedException('권한이 없습니다.');
    }

    const targetMember =
      await this.adminRepository.findAdminByMemberId(targetId);
    if (!targetMember) {
      throw new BadRequestException('해당 유저를 찾을 수 없습니다.');
    }
    if (targetMember.isAdmin()) {
      throw new BadRequestException('해당 유저는 이미 관리자입니다.');
    }

    await this.adminRepository.createAdminLevel(targetId, adminLevel);

    const createdAdmin =
      await this.adminRepository.findAdminByMemberId(targetId);
    if (!createdAdmin) {
      throw new UnauthorizedException('등록된 관리자를 찾을 수 없습니다.');
    }

    return {
      message: '관리자 권한이 성공적으로 부여되었습니다.',
      admin: createdAdmin,
    };
  }

  async changeAdminLevel(
    requestAdminId: number,
    targetId: number,
    adminLevel: 'SUPER' | 'SUB',
  ): Promise<AdminResultWithMessage> {
    if (requestAdminId === targetId) {
      throw new BadRequestException('본인의 권한은 수정할 수 없습니다.');
    }

    const requestAdmin =
      await this.adminRepository.findAdminByMemberId(requestAdminId);
    if (!requestAdmin || !requestAdmin.isSuperAdmin()) {
      throw new UnauthorizedException('권한이 없습니다.');
    }

    await this.adminRepository.updateAdminLevel(targetId, adminLevel);

    const updatedAdmin =
      await this.adminRepository.findAdminByMemberId(targetId);
    if (!updatedAdmin) {
      throw new UnauthorizedException('변경된 관리자를 찾을 수 없습니다.');
    }

    return {
      message: '관리자 권한이 성공적으로 변경되었습니다.',
      admin: updatedAdmin,
    };
  }

  async deleteAdminLevel(
    requestAdminId: number,
    targetId: number,
  ): Promise<AdminResultWithMessage> {
    if (requestAdminId === targetId) {
      throw new BadRequestException('본인의 권한은 수정할 수 없습니다.');
    }

    const requestAdmin =
      await this.adminRepository.findAdminByMemberId(requestAdminId);
    if (!requestAdmin || !requestAdmin.isSuperAdmin()) {
      throw new UnauthorizedException('권한이 없습니다.');
    }

    const targetAdmin =
      await this.adminRepository.findAdminByMemberId(targetId);
    if (!targetAdmin) {
      throw new UnauthorizedException('관리자를 찾을 수 없습니다.');
    }

    await this.adminRepository.deleteAdminLevel(targetId);

    return {
      message: '관리자 권한이 성공적으로 삭제되었습니다.',
      admin: targetAdmin,
    };
  }
}
