export const AdminAuthUseCasePort = Symbol('AdminAuthUseCasePort');

/**
 * Admin 인증 Use Case (로그인, 토큰 연장만 담당)
 * - 가입 요청/수락/거절, 강제 탈퇴 등 회원 관리 → AdminMemberControlUseCasePort
 */
export interface AdminAuthUseCasePort {
  adminLogin(email: string, password: string): Promise<{ token: string }>;

  adminExtendToken(adminId: number): Promise<{ token: string }>;
}
