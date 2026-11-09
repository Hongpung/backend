import type { AdminLevel } from 'src/features/admin/domain/admin.type';

export const MemberAuthAdminLookupPort = Symbol('MemberAuthAdminLookupPort');

export type MemberAuthAdminEmail = {
  email: string;
  adminLevel: AdminLevel;
  clubId: number | null;
};

export interface MemberAuthAdminLookupPort {
  verifyAdminPassword(adminId: number, password: string): Promise<boolean>;
  findAdminEmails(): Promise<MemberAuthAdminEmail[]>;
}
