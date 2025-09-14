import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { Notice } from '../models/notice.model';
import { NoticeRepositoryMapper } from './mappers/notice.prisma.mapper';
import type { INoticeRepository } from './notice.repository.port';

@Injectable()
export class NoticeRepository implements INoticeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Notice[]> {
    const notices = await this.prisma.notice.findMany({
      where: { channel: null },
      orderBy: { createdAt: 'desc' },
    });
    return notices.map((n) => NoticeRepositoryMapper.toModel(n));
  }

  async findById(noticeId: number): Promise<Notice | null> {
    const notice = await this.prisma.notice.findUnique({
      where: { noticeId },
    });
    if (!notice) return null;
    return NoticeRepositoryMapper.toModel(notice);
  }

  async create(params: {
    title: string;
    content: string;
    channel?: number;
  }): Promise<Notice> {
    const notice = await this.prisma.notice.create({
      data: NoticeRepositoryMapper.toCreateInput(params, params.channel),
    });
    return NoticeRepositoryMapper.toModel(notice);
  }

  async update(noticeId: number, notice: Notice): Promise<Notice> {
    const row = await this.prisma.notice.update({
      where: { noticeId },
      data: NoticeRepositoryMapper.toUpdateInput(notice),
    });
    return NoticeRepositoryMapper.toModel(row);
  }

  async delete(noticeId: number): Promise<void> {
    await this.prisma.notice.delete({
      where: { noticeId },
    });
  }
}
