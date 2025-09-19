import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { Instrument } from '../models/instrument.model';
import type { IInstrumentRepository } from './instrument.repository.port';
import { InstrumentRepositoryMapper } from './mappers/instrument.prisma.mapper';

@Injectable()
export class InstrumentRepository implements IInstrumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBorrowableInstruments(
    clubId: number | null,
    page = 1,
    pageSize = 10,
  ): Promise<Instrument[]> {
    const instruments = await this.prisma.instrument.findMany({
      where: { clubId: { not: clubId }, borrowAvailable: true },
      include: { club: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return instruments.map((i) => InstrumentRepositoryMapper.toModel(i));
  }

  async findByIds(instrumentIds: number[]): Promise<Instrument[]> {
    if (instrumentIds.length === 0) return [];
    const instruments = await this.prisma.instrument.findMany({
      where: { instrumentId: { in: instrumentIds } },
      include: { club: true },
    });
    return instruments.map((i) => InstrumentRepositoryMapper.toModel(i));
  }

  async findDetail(instrumentId: number): Promise<Instrument | null> {
    const instrument = await this.prisma.instrument.findUnique({
      where: { instrumentId },
      include: { club: true },
    });
    return instrument ? InstrumentRepositoryMapper.toModel(instrument) : null;
  }

  async create(instrument: Instrument): Promise<Instrument> {
    const created = await this.prisma.instrument.create({
      data: InstrumentRepositoryMapper.toCreateInput(instrument),
      include: { club: true },
    });
    return InstrumentRepositoryMapper.toModel(created);
  }

  async update(
    instrumentId: number,
    instrument: Instrument,
  ): Promise<Instrument> {
    const updated = await this.prisma.instrument.update({
      where: { instrumentId },
      data: InstrumentRepositoryMapper.toUpdateInput(instrument),
      include: { club: true },
    });
    return InstrumentRepositoryMapper.toModel(updated);
  }

  async delete(instrumentId: number, clubId: number): Promise<void> {
    await this.prisma.instrument.deleteMany({
      where: { instrumentId, clubId },
    });
  }
}
