import type { Banner } from './banner.model';

export interface CreateBannerParams {
  owner: string;
  bannerImgUrl: string;
  href: string | null;
  startDate: Date;
  endDate: Date;
}

export interface UpdateBannerParams {
  owner?: string;
  bannerImgUrl?: string;
  href?: string | null;
  startDate?: Date;
  endDate?: Date;
}

export interface BannerListResult {
  afterPost: Banner[];
  onPost: Banner[];
  beforePost: Banner[];
}
