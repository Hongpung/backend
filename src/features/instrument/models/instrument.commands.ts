import type { EnInstrumentType } from './instrument.model';

export type CreateInstrumentParams = {
  name: string;
  instrumentType: EnInstrumentType;
  imageUrl?: string | null;
};

export type UpdateInstrumentParams = {
  name?: string;
  instrumentType?: EnInstrumentType;
  imageUrl?: string | null;
  borrowAvailable?: boolean;
};
