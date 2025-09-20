export const MemberAuthAdminLookupPort = Symbol('MemberAuthAdminLookupPort');

export type MemberAuthAdminEmail = { email: string };

export interface MemberAuthAdminLookupPort {
  verifyAdminPassword(adminId: number, password: string): Promise<boolean>;
  findAdminEmails(): Promise<MemberAuthAdminEmail[]>;
}
