/**
 * Reservation 도메인에서 사용하는 Participator 엔티티
 * Member 도메인에 의존하지 않고 필요한 정보만 포함
 */
export class ReservationParticipator {
  private readonly _memberId: number;
  private readonly _name: string;
  private readonly _nickname: string | null;
  private readonly _email: string;
  private readonly _enrollmentNumber: string;
  private readonly _profileImageUrl: string | null;
  private readonly _blogUrl: string | null;
  private readonly _instagramUrl: string | null;
  private readonly _clubName: string | null;
  private readonly _roles: string[];

  private constructor(
    memberId: number,
    name: string,
    nickname: string | null,
    email: string,
    enrollmentNumber: string,
    profileImageUrl: string | null,
    blogUrl: string | null,
    instagramUrl: string | null,
    clubName: string | null,
    roles: string[],
  ) {
    this._memberId = memberId;
    this._name = name;
    this._nickname = nickname;
    this._email = email;
    this._enrollmentNumber = enrollmentNumber;
    this._profileImageUrl = profileImageUrl;
    this._blogUrl = blogUrl;
    this._instagramUrl = instagramUrl;
    this._clubName = clubName;
    this._roles = roles;
  }

  static create({
    memberId,
    name,
    nickname,
    email,
    enrollmentNumber,
    profileImageUrl,
    blogUrl,
    instagramUrl,
    clubName,
    roles,
  }: {
    memberId: number;
    name: string;
    nickname: string | null;
    email: string;
    enrollmentNumber: string;
    profileImageUrl: string | null;
    blogUrl: string | null;
    instagramUrl: string | null;
    clubName: string | null;
    roles: string[];
  }) {
    return new ReservationParticipator(
      memberId,
      name,
      nickname,
      email,
      enrollmentNumber,
      profileImageUrl,
      blogUrl,
      instagramUrl,
      clubName,
      roles,
    );
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

  get email(): string {
    return this._email;
  }

  get enrollmentNumber(): string {
    return this._enrollmentNumber;
  }

  get profileImageUrl(): string | null {
    return this._profileImageUrl;
  }

  get blogUrl(): string | null {
    return this._blogUrl;
  }

  get instagramUrl(): string | null {
    return this._instagramUrl;
  }

  get clubName(): string | null {
    return this._clubName;
  }

  get roles(): string[] {
    return this._roles;
  }
}
