import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import { EventBus } from 'src/infrastructure/events/event.provider';
import type { Notice } from '../models/notice.model';
import { updateNotice } from '../models/notice.model';
import type {
  CreateNoticeParams,
  UpdateNoticeParams,
} from '../models/notice.commands';
import {
  NoticeRepositoryPort,
  type INoticeRepository,
} from '../repositories/notice.repository.port';
import { NoticeMemberService } from './notice-member.service';
import { buildNoticeAllPushPayload } from './notice-push-notification.messages';

@Injectable()
export class NoticeAdminService {
  constructor(
    private readonly noticeMemberService: NoticeMemberService,
    @Inject(NoticeRepositoryPort)
    private readonly repository: INoticeRepository,
    private readonly eventBus: EventBus,
  ) {}

  async create(params: CreateNoticeParams): Promise<Notice> {
    const { noticeAll, ...createParams } = params;
    const notice = await this.repository.create(createParams);

    const noticeId = typeof notice.noticeId === 'number' ? notice.noticeId : 0;

    if (noticeAll && !params.channel) {
      this.eventBus.emitTyped(
        EVENT_TOKEN.SEND_ALL_NOTIFICATION,
        buildNoticeAllPushPayload(noticeId, notice.title),
      );
    }

    return notice;
  }

  async update(noticeId: number, params: UpdateNoticeParams): Promise<Notice> {
    const found = await this.noticeMemberService.findById(noticeId);
    if (!found) {
      throw new NotFoundException('Notice not found');
    }

    const { noticeAll, ...updateParams } = params;
    const toPersist = updateNotice(found, updateParams);
    const updated = await this.repository.update(noticeId, toPersist);

    if (noticeAll && !updated.channel) {
      this.eventBus.emitTyped(
        EVENT_TOKEN.SEND_ALL_NOTIFICATION,
        buildNoticeAllPushPayload(
          updated.noticeId ?? noticeId,
          updated.title,
        ),
      );
    }

    return updated;
  }

  async remove(noticeId: number): Promise<void> {
    const found = await this.noticeMemberService.findById(noticeId);
    if (!found) {
      throw new NotFoundException('Notice not found');
    }
    await this.repository.delete(noticeId);
  }
}
