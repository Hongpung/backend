import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { Banner } from '../models/banner.model';
import { BannerRepositoryMapper } from './mappers/banner.prisma.mapper';
import type { IBannerRepository } from './banner.repository.port';

@Injectable()
export class BannerRepository implements IBannerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(banner: Banner): Promise<Banner> {
    const row = await this.prisma.banner.create({
      data: BannerRepositoryMapper.toCreatePersistenceData(banner),
    });
    return BannerRepositoryMapper.toModel(row);
  }

  async findById(id: number): Promise<Banner | null> {
    const row = await this.prisma.banner.findUnique({
      where: { bannerId: id },
    });
    return row ? BannerRepositoryMapper.toModel(row) : null;
  }

  async findAll(): Promise<Banner[]> {
    const rows = await this.prisma.banner.findMany({
      orderBy: { startDate: 'desc' },
    });
    return BannerRepositoryMapper.toModelArray(rows);
  }

  async update(id: number, banner: Banner): Promise<Banner> {
    const row = await this.prisma.banner.update({
      where: { bannerId: id },
      data: BannerRepositoryMapper.toUpdatePersistenceData(banner),
    });
    return BannerRepositoryMapper.toModel(row);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.banner.delete({
      where: { bannerId: id },
    });
  }

  async findByDateConditions(conditions: {
    startDateBefore?: Date;
    startDateAfter?: Date;
    endDateBefore?: Date;
    endDateAfter?: Date;
  }): Promise<Banner[]> {
    const where: {
      startDate?: { lt?: Date; gt?: Date };
      endDate?: { lt?: Date; gte?: Date };
    } = {};

    if (conditions.startDateBefore) {
      where.startDate = { ...where.startDate, lt: conditions.startDateBefore };
    }
    if (conditions.startDateAfter) {
      where.startDate = { ...where.startDate, gt: conditions.startDateAfter };
    }
    if (conditions.endDateBefore) {
      where.endDate = { ...where.endDate, lt: conditions.endDateBefore };
    }
    if (conditions.endDateAfter) {
      where.endDate = { ...where.endDate, gte: conditions.endDateAfter };
    }

    const rows = await this.prisma.banner.findMany({
      where,
      orderBy: { startDate: 'desc' },
    });
    return BannerRepositoryMapper.toModelArray(rows);
  }

  async findByOwner(owner: string): Promise<Banner[]> {
    const rows = await this.prisma.banner.findMany({
      where: { owner },
      orderBy: { startDate: 'desc' },
    });
    return BannerRepositoryMapper.toModelArray(rows);
  }
}
