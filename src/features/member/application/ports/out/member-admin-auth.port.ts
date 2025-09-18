export const MemberAdminAuthPort = Symbol('MemberAdminAuthPort');

export interface IMemberAdminAuthPort {
  verifyAdminPassword(adminId: number, password: string): Promise<boolean>;
}
