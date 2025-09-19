import type { Instrument } from '../models/instrument.model';

export const InstrumentRepositoryPort = Symbol('InstrumentRepositoryPort');

export interface IInstrumentRepository {
  findBorrowableInstruments(
    clubId: number | null,
    page?: number,
    pageSize?: number,
  ): Promise<Instrument[]>;
  findByIds(instrumentIds: number[]): Promise<Instrument[]>;
  findDetail(instrumentId: number): Promise<Instrument | null>;
  create(instrument: Instrument): Promise<Instrument>;
  update(instrumentId: number, instrument: Instrument): Promise<Instrument>;
  delete(instrumentId: number, clubId: number): Promise<void>;
}
