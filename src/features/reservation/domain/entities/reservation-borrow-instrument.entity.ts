import type { EnInstrumentType } from 'src/features/instrument/models/instrument.model';

/**
 * Reservation 도메인에서 사용하는 BorrowInstrument 엔티티
 * Instrument 도메인에 의존하지 않고 필요한 정보만 포함
 */
export class ReservationBorrowInstrument {
  private readonly _instrumentId: number;
  private readonly _name: string;
  private readonly _instrumentType: EnInstrumentType;
  private readonly _imageUrl: string | null;
  private readonly _borrowAvailable: boolean;
  private readonly _clubName: string;

  private constructor(
    instrumentId: number,
    name: string,
    instrumentType: EnInstrumentType,
    imageUrl: string | null,
    borrowAvailable: boolean,
    clubName: string,
  ) {
    this._instrumentId = instrumentId;
    this._name = name;
    this._instrumentType = instrumentType;
    this._imageUrl = imageUrl;
    this._borrowAvailable = borrowAvailable;
    this._clubName = clubName;
  }

  static create({
    instrumentId,
    name,
    instrumentType,
    imageUrl,
    borrowAvailable,
    clubName,
  }: {
    instrumentId: number;
    name: string;
    instrumentType: EnInstrumentType;
    imageUrl: string | null;
    borrowAvailable: boolean;
    clubName: string;
  }) {
    return new ReservationBorrowInstrument(
      instrumentId,
      name,
      instrumentType,
      imageUrl,
      borrowAvailable,
      clubName,
    );
  }

  get instrumentId(): number {
    return this._instrumentId;
  }

  get name(): string {
    return this._name;
  }

  get instrumentType(): EnInstrumentType {
    return this._instrumentType;
  }

  get imageUrl(): string | null {
    return this._imageUrl;
  }

  get borrowAvailable(): boolean {
    return this._borrowAvailable;
  }

  get clubName(): string {
    return this._clubName;
  }

  isBorrowAvailable(): boolean {
    return this._borrowAvailable;
  }

  getClubName(): string {
    return this._clubName;
  }
}
