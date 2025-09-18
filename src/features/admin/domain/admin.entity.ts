import { AdminLevel } from './admin.type';
import { ClubVO as Club } from './club.vo';

/**
 * Admin 도메인 엔티티
 *
 * 관리자 관련 비즈니스 로직을 포함합니다.
 * 관리자 권한 확인과 관리자 전용 기능을 담당합니다.
 */
export class AdminEntity {
  private readonly _memberId: number;
  private readonly _name: string;
  private readonly _nickname: string | null;
  private readonly _enrollmentNumber: string;
  private readonly _email: string;
  private readonly _clubId: number | null;
  private readonly _club: Club | null;
  private readonly _adminLevel: AdminLevel | null;

  private constructor(data: {
    memberId: number;
    email: string;
    name: string;
    nickname: string | null;
    enrollmentNumber: string;
    clubId: number | null;
    club: Club | null;
    adminLevel: AdminLevel | null;
  }) {
    this._memberId = data.memberId;
    this._name = data.name;
    this._nickname = data.nickname;
    this._enrollmentNumber = data.enrollmentNumber;
    this._email = data.email;
    this._clubId = data.clubId;
    this._club = data.club;
    this._adminLevel = data.adminLevel;
  }

  static create(data: {
    memberId: number;
    email: string;
    name: string;
    nickname: string | null;
    enrollmentNumber: string;
    clubId: number | null;
    club: Club | null;
    adminLevel: AdminLevel | null;
  }) {
    return new AdminEntity({ ...data });
  }

  get memberId(): number {
    return this._memberId;
  }

  get name(): string {
    return this._name;
  }

  get nickname(): string | null {
    return this._nickname;
  }

  get enrollmentNumber(): string {
    return this._enrollmentNumber;
  }

  get email(): string {
    return this._email;
  }

  get clubId(): number | null {
    return this._clubId;
  }

  get club(): Club | null {
    return this._club;
  }

  get adminLevel(): AdminLevel | null {
    return this._adminLevel;
  }

  isSuperAdmin(): boolean {
    return this._adminLevel === 'SUPER';
  }

  isSubAdmin(): boolean {
    return this._adminLevel === 'SUB';
  }

  isAdmin(): boolean {
    return this._adminLevel !== null;
  }

  canManageAdmin(targetAdmin: AdminEntity): boolean {
    if (this._memberId === targetAdmin._memberId) {
      return false;
    }
    return this.isSuperAdmin();
  }

  getAdminJwtPayload() {
    return {
      adminId: this._memberId,
      adminRole: this._adminLevel,
    };
  }
}
