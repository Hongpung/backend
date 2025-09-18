import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  AdminRepositoryPort,
  type IAdminRepository,
} from '../ports/out/admin.repository.port';
import { AdminLevelLookupUseCase } from '../ports/in/admin-level-lookup.use-case';

@Injectable()
export class AdminLevelLookupService implements AdminLevelLookupUseCase {
  constructor(
    @Inject(AdminRepositoryPort)
    private readonly adminRepository: IAdminRepository,
  ) {}

  async assertIsAdmin(memberId: number): Promise<void> {
    const admin = await this.adminRepository.findAdminLevel(memberId);
    if (!admin?.isAdmin()) {
      throw new UnauthorizedException('권한이 없습니다.');
    }
  }

  async assertIsSuperAdmin(memberId: number): Promise<{ name: string }> {
    const admin = await this.adminRepository.findAdminLevel(memberId);
    if (!admin?.isSuperAdmin()) {
      throw new UnauthorizedException('권한이 없습니다.');
    }
    return { name: admin.name };
  }
}
