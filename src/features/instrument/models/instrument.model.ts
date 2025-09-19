export type KoInstrumentType =
  | '꽹과리'
  | '징'
  | '장구'
  | '북'
  | '소고'
  | '기타';

export type EnInstrumentType =
  | 'KWANGGWARI'
  | 'JING'
  | 'JANGGU'
  | 'BUK'
  | 'SOGO'
  | 'ELSE';

export type InstrumentBorrowHistory = {
  borrowerName: string;
  borrowerNickname?: string;
  borrowDate: string;
};

export interface InstrumentClub {
  clubId: number;
  clubName: string;
}

export interface Instrument {
  instrumentId: number;
  name: string;
  instrumentType: EnInstrumentType;
  club: InstrumentClub;
  imageUrl: string | null;
  borrowAvailable: boolean;
  borrowHistory: InstrumentBorrowHistory[];
}

export function createInstrumentClub(data: {
  clubId: number;
  clubName: string;
}): InstrumentClub {
  return { clubId: data.clubId, clubName: data.clubName };
}

export function createInstrument(data: {
  instrumentId: number;
  instrumentType: EnInstrumentType;
  club: InstrumentClub;
  name: string;
  imageUrl: string | null;
  borrowAvailable: boolean;
  borrowHistory?: InstrumentBorrowHistory[];
}): Instrument {
  return {
    instrumentId: data.instrumentId,
    instrumentType: data.instrumentType,
    club: data.club,
    name: data.name,
    imageUrl: data.imageUrl,
    borrowAvailable: data.borrowAvailable,
    borrowHistory: data.borrowHistory ?? [],
  };
}

export function canBeBorrowedBy(
  instrument: Instrument,
  clubId: number | null,
): boolean {
  if (!clubId) return false;
  return instrument.club.clubId !== clubId && instrument.borrowAvailable;
}

export function belongsToClub(instrument: Instrument, clubId: number): boolean {
  return instrument.club.clubId === clubId;
}
