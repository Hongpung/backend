import { Inject, Injectable } from '@nestjs/common';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import type { Banner } from '../models/banner.model';
import {
  BannerRepositoryPort,
  type IBannerRepository,
} from '../repositories/banner.repository.port';

@Injectable()
export class BannerMemberService {
  constructor(
    @Inject(BannerRepositoryPort)
    private readonly repository: IBannerRepository,
  ) {}

  async findOnPost(): Promise<Banner[]> {
    return this.repository.findByDateConditions({
      startDateBefore: AppKstDateTime.tomorrowDateAnchorForDb(),
      endDateAfter: AppKstDateTime.todayDateAnchorForDb(),
    });
  }
}
