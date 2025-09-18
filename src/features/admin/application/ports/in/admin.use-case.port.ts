import { AdminEntity } from '../../../domain/admin.entity';
import { AdminLevel } from '../../../domain/admin.type';

export const AdminUseCasePort = Symbol('AdminUseCasePort');

export interface AdminResultWithMessage {
  message: string;
  admin: AdminEntity;
}

export interface AdminUseCasePort {
  getAdmins(): Promise<AdminEntity[]>;

  createAdmin(
    requestAdminId: number,
    targetId: number,
    adminLevel: AdminLevel,
  ): Promise<AdminResultWithMessage>;

  changeAdminLevel(
    requestAdminId: number,
    targetId: number,
    adminLevel: AdminLevel,
  ): Promise<AdminResultWithMessage>;

  deleteAdminLevel(
    requestAdminId: number,
    targetId: number,
  ): Promise<AdminResultWithMessage>;
}
