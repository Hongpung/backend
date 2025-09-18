/** Cross-feature lookup용 읽기 전용 회원 스냅샷 (도메인 엔티티 노출 방지) */
export type MemberLookupReadModel = {
  memberId: number;
  name: string;
  nickname: string | null;
  enrollmentNumber: string;
  email: string;
  clubName: string | null;
  roles: string[];
  profileImageUrl: string | null;
  blogUrl: string | null;
  instagramUrl: string | null;
  notificationToken: string | null;
};
