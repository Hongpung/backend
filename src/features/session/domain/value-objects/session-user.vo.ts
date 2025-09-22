/**
 * Session 도메인에서 사용하는 사용자 정보
 * - reservation.types.User로부터 분리되어 session의 독립적인 타입으로 정의
 * - 타입 정의만 포함하며, 비즈니스 로직은 없음
 */

export interface SessionUser {
  memberId: number;
  email: string;
  name: string;
  nickname?: string;
  club: string;
  enrollmentNumber: string;
  role: string[];
  profileImageUrl?: string;
}
