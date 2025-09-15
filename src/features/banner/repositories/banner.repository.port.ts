import type { Banner } from '../models/banner.model';

export const BannerRepositoryPort = Symbol('BannerRepositoryPort');

export interface IBannerRepository {
  create(banner: Banner): Promise<Banner>;
  findById(id: number): Promise<Banner | null>;
  findAll(): Promise<Banner[]>;
  update(id: number, banner: Banner): Promise<Banner>;
  delete(id: number): Promise<void>;
  findByDateConditions(conditions: {
    startDateBefore?: Date;
    startDateAfter?: Date;
    endDateBefore?: Date;
    endDateAfter?: Date;
  }): Promise<Banner[]>;
  findByOwner(owner: string): Promise<Banner[]>;
}
