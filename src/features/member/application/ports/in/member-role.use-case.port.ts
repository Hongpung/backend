import type { KoRole } from 'src/role/role.type';

export const MemberRoleUseCasePort = Symbol('MemberRoleUseCasePort');

export interface MemberRoleUseCasePort {
  assignRole(memberId: number, roles: KoRole[]): Promise<{ message: string }>;
}
