import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { createBanner, type Banner } from '../models/banner.model';
import type {
  BannerListResult,
  CreateBannerParams,
  UpdateBannerParams,
} from '../models/banner.commands';
import {
  BannerRepositoryPort,
  type IBannerRepository,
} from '../repositories/banner.repository.port';
import { BannerMemberService } from './banner-member.service';

@Injectable()
export class BannerAdminService {
  constructor(
    private readonly bannerMemberService: BannerMemberService,
    @Inject(BannerRepositoryPort)
    private readonly repository: IBannerRepository,
  ) {}

  async findAll(): Promise<BannerListResult> {
    const [afterPost, onPost, beforePost] = await Promise.all([
      this.findAfterPost(),
      this.bannerMemberService.findOnPost(),
      this.findBeforePost(),
    ]);
    return { afterPost, onPost, beforePost };
  }

  async create(params: CreateBannerParams): Promise<Banner> {
    const banner = createBanner({
      owner: params.owner,
      bannerImgUrl: params.bannerImgUrl,
      href: params.href ?? null,
      startDate: params.startDate,
      endDate: params.endDate,
    });
    return this.repository.create(banner);
  }

  async update(id: number, params: UpdateBannerParams): Promise<Banner> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Banner not found');
    }

    const updated = createBanner({
      bannerId: existing.bannerId,
      owner: params.owner ?? existing.owner,
      bannerImgUrl: params.bannerImgUrl ?? existing.bannerImgUrl,
      href: params.href !== undefined ? params.href : existing.href,
      startDate: params.startDate ?? existing.startDate,
      endDate: params.endDate ?? existing.endDate,
    });
    return this.repository.update(id, updated);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Banner not found');
    }
    await this.repository.delete(id);
  }

  private async findAfterPost(): Promise<Banner[]> {
    return this.repository.findByDateConditions({
      endDateBefore: AppKstDateTime.todayDateAnchorForDb(),
    });
  }

  private async findBeforePost(): Promise<Banner[]> {
    return this.repository.findByDateConditions({
      startDateAfter: AppKstDateTime.todayDateAnchorForDb(),
    });
  }
}
