import type { AdminAuthEntity } from '../../../domain/admin-auth.entity';

export const AdminAuthRepositoryPort = Symbol('AdminAuthRepositoryPort');

/**
 * Admin 인증 전용 Repository
 * - findPendingSignups, acceptAuthsPermission, rejectAuthsPermission, deleteAccount, existsMember
 *   → Member 모듈 통합으로 MemberRepository로 이동
 */
export interface IAdminAuthRepository {
  findAuthByEmail(email: string): Promise<AdminAuthEntity | null>;

  findAdminByMemberId(memberId: number): Promise<AdminAuthEntity | null>;

  findAdminEmails(): Promise<Array<{ email: string }>>;
}
