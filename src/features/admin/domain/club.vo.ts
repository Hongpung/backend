export class ClubVO {
  private readonly _clubId: number;
  private readonly _clubName: string;

  private constructor(clubId: number, clubName: string) {
    this._clubId = clubId;
    this._clubName = clubName;
  }

  static create(data: { clubId: number; clubName: string }) {
    return new ClubVO(data.clubId, data.clubName);
  }

  get clubId() {
    return this._clubId;
  }

  get clubName() {
    return this._clubName;
  }
}
