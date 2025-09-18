import type { MemberRole, PermitStatus } from './member.type';
import type { KoRole } from 'src/role/role.type';
import { RoleEnum } from 'src/role/role.enum';

/**
 * Member 도메인 엔티티
 * 도메인 순수성: ClubEntity 대신 plain object { clubName } 사용
 */
export class MemberEntity {
  private _memberId: number;
  private _name: string;
  private _nickname: string | null;
  private _enrollmentNumber: string;
  private _email: string;
  private _clubId: number | null;
  private _club: { clubName: string } | null;
  private _roleAssignment: Array<{ role: MemberRole }>;
  private _isPermmited: PermitStatus;
  private _profileImageUrl: string | null;
  private _instagramUrl: string | null;
  private _blogUrl: string | null;
  private _password?: string | null;
  private _pushEnable: boolean;
  private _notificationToken: string | null;

  private constructor(
    memberId: number,
    name: string,
    nickname: string | null,
    enrollmentNumber: string,
    email: string,
    clubId: number | null,
    club: { clubName: string } | null,
    roleAssignment: Array<{ role: MemberRole }>,
    isPermmited: PermitStatus,
    profileImageUrl: string | null,
    instagramUrl: string | null,
    blogUrl: string | null,
    pushEnable: boolean,
    notificationToken: string | null,
    password?: string | null,
  ) {
    this._memberId = memberId;
    this._name = name;
    this._nickname = nickname;
    this._enrollmentNumber = enrollmentNumber;
    this._email = email;
    this._clubId = clubId;
    this._club = club;
    this._roleAssignment = roleAssignment;
    this._isPermmited = isPermmited;
    this._profileImageUrl = profileImageUrl;
    this._instagramUrl = instagramUrl;
    this._blogUrl = blogUrl;
    this._pushEnable = pushEnable;
    this._notificationToken = notificationToken;
    this._password = password ?? null;
  }

  static create(data: {
    memberId: number;
    name: string;
    nickname: string | null;
    enrollmentNumber: string;
    email: string;
    clubId: number | null;
    club: { clubId: number; clubName: string } | null;
    roleAssignment: Array<{ role: MemberRole }>;
    isPermmited: PermitStatus;
    profileImageUrl: string | null;
    instagramUrl: string | null;
    blogUrl: string | null;
    pushEnable?: boolean;
    notificationToken?: string | null;
    password?: string | null;
  }) {
    return new MemberEntity(
      data.memberId,
      data.name,
      data.nickname,
      data.enrollmentNumber,
      data.email,
      data.clubId,
      data.club ? { clubName: data.club.clubName } : null,
      data.roleAssignment,
      data.isPermmited,
      data.profileImageUrl,
      data.instagramUrl,
      data.blogUrl,
      data.pushEnable ?? false,
      data.notificationToken ?? null,
      data.password,
    );
  }

  get memberId() {
    return this._memberId;
  }
  get name() {
    return this._name;
  }
  get nickname() {
    return this._nickname;
  }
  get enrollmentNumber() {
    return this._enrollmentNumber;
  }
  get email() {
    return this._email;
  }
  get clubId() {
    return this._clubId;
  }
  get club() {
    return this._club;
  }
  get roleAssignment() {
    return this._roleAssignment;
  }
  get isPermmited() {
    return this._isPermmited;
  }
  get profileImageUrl() {
    return this._profileImageUrl;
  }
  get instagramUrl() {
    return this._instagramUrl;
  }
  get blogUrl() {
    return this._blogUrl;
  }
  get password() {
    return this._password;
  }
  get pushEnable() {
    return this._pushEnable;
  }
  get notificationToken() {
    return this._notificationToken;
  }

  getClubName(): string | null {
    return this._club?.clubName || null;
  }
  getRoles(): MemberRole[] {
    return this._roleAssignment.map((ra) => ra.role);
  }
  getRolesAsKorean(): KoRole[] {
    return this._roleAssignment.map((ra) => RoleEnum.EnToKo(ra.role));
  }
  getRolesAsString(): string[] {
    return this._roleAssignment.map((ra) => ra.role);
  }
  getDisplayName(): string {
    return this._nickname || this._name;
  }

  hasClub(): boolean {
    return this._clubId !== null && this._club !== null;
  }
  isAccepted(): boolean {
    return this._isPermmited === 'ACCEPTED';
  }
  isPending(): boolean {
    return this._isPermmited === 'PENDING';
  }
  isDenied(): boolean {
    return this._isPermmited === 'DENIED';
  }
  canLogin(): boolean {
    return this.isAccepted();
  }

  hasRole(role: MemberRole): boolean {
    return this._roleAssignment.some((ra) => ra.role === role);
  }
  isLeader(): boolean {
    return this.hasRole('LEADER');
  }
  hasAnyRole(): boolean {
    return this._roleAssignment.length > 0;
  }

  getProfileImageUrl(): string | null {
    return this._profileImageUrl;
  }
  hasProfileImage(): boolean {
    return this._profileImageUrl !== null && this._profileImageUrl !== '';
  }
  hasSnsLinks(): boolean {
    return (
      (this._instagramUrl !== null && this._instagramUrl !== '') ||
      (this._blogUrl !== null && this._blogUrl !== '')
    );
  }

  isPushEnabled(): boolean {
    return this._pushEnable;
  }
  hasNotificationToken(): boolean {
    return this._notificationToken !== null && this._notificationToken !== '';
  }

  updateProfile(data: {
    nickname?: string | null;
    profileImageUrl?: string | null;
    instagramUrl?: string | null;
    blogUrl?: string | null;
  }) {
    if (data.nickname !== undefined) this._nickname = data.nickname;
    if (data.profileImageUrl !== undefined)
      this._profileImageUrl = data.profileImageUrl;
    if (data.instagramUrl !== undefined) this._instagramUrl = data.instagramUrl;
    if (data.blogUrl !== undefined) this._blogUrl = data.blogUrl;
  }
}
