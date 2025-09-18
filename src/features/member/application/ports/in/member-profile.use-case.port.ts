import type { MemberEntity } from '../../../domain/member.entity';

export const MemberProfileUseCasePort = Symbol('MemberProfileUseCasePort');

export interface UpdateMemberProfileParams {
  profileImageUrl?: string | null;
  nickname?: string | null;
  instagramUrl?: string | null;
  blogUrl?: string | null;
}

export interface UpdateMemberByAdminParams
  extends Omit<
    UpdateMemberProfileParams,
    'profileImageUrl' | 'instagramUrl' | 'blogUrl'
  > {
  /** 관리자만 수정 (본인 프로필 수정 API에는 없음) */
  name?: string;
  clubId?: number | null;
  email?: string;
  /** 동아리·이메일 실제 변경 시 검증용 (저장하지 않음) */
  adminPassword?: string;
}

export interface MemberProfileUseCasePort {
  getMyStatus(memberId: number): Promise<MemberEntity>;
  updateMyStatus(
    memberId: number,
    data: UpdateMemberProfileParams,
  ): Promise<MemberEntity>;
  updateMemberByAdmin(
    adminMemberId: number,
    targetMemberId: number,
    data: UpdateMemberByAdminParams,
  ): Promise<MemberEntity>;
}
