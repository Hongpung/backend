import type { AdminLevel } from '../../../domain/admin.type';
import type { AdminEntity } from '../../../domain/admin.entity';

export const AdminRepositoryPort = Symbol('AdminRepositoryPort');

export interface IAdminRepository {
  findAllAdmins(): Promise<AdminEntity[]>;

  findAdminLevel(memberId: number): Promise<AdminEntity | null>;

  findAdminByMemberId(memberId: number): Promise<AdminEntity | null>;

  createAdminLevel(memberId: number, adminLevel: AdminLevel): Promise<void>;

  updateAdminLevel(memberId: number, adminLevel: AdminLevel): Promise<void>;

  deleteAdminLevel(memberId: number): Promise<void>;
}
