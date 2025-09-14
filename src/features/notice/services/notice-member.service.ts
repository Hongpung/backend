import { Inject, Injectable } from '@nestjs/common';
import type { Notice } from '../models/notice.model';
import {
  NoticeRepositoryPort,
  type INoticeRepository,
} from '../repositories/notice.repository.port';

@Injectable()
export class NoticeMemberService {
  constructor(
    @Inject(NoticeRepositoryPort)
    private readonly repository: INoticeRepository,
  ) {}

  async findAll(): Promise<Notice[]> {
    return this.repository.findAll();
  }

  async findById(noticeId: number): Promise<Notice | null> {
    return this.repository.findById(noticeId);
  }
}
