import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { NoticeAdminService } from './notice-admin.service';
import { NoticeMemberService } from './notice-member.service';
import { EventBus } from 'src/infrastructure/events/event.provider';
import { buildNoticeDeepLink } from 'src/contracts/deep-link/deep-link';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import { createNotice, type Notice } from '../models/notice.model';
import type { INoticeRepository } from '../repositories/notice.repository.port';

describe('NoticeAdminService (공지 관리)', () => {
  let service: NoticeAdminService;
  let noticeMemberService: {
    findById: jest.Mock<(noticeId: number) => Promise<Notice | null>>;
  };
  let repository: jest.Mocked<INoticeRepository>;
  let eventBus: { emitTyped: jest.Mock };

  const createdAtFixture = new Date('2025-01-01T00:00:00.000Z');
  const updatedAtFixture = new Date('2025-01-02T00:00:00.000Z');

  const makeNotice = (opts: {
    noticeId?: number;
    title?: string;
    content?: string;
    channel?: number;
  }) =>
    createNotice({
      title: opts.title ?? '제목',
      content: opts.content ?? '내용',
      noticeId: opts.noticeId ?? 42,
      channel: opts.channel,
      createdAt: createdAtFixture,
      updatedAt: updatedAtFixture,
    });

  beforeEach(() => {
    noticeMemberService = { findById: jest.fn() };
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    eventBus = { emitTyped: jest.fn() };

    service = new NoticeAdminService(
      noticeMemberService as unknown as NoticeMemberService,
      repository,
      eventBus as unknown as EventBus,
    );
  });

  describe('create', () => {
    it('noticeAll이 true이고 channel이 없으면 SEND_ALL_NOTIFICATION 이벤트를 발행한다', async () => {
      const created = makeNotice({ noticeId: 7, title: '전체 공지' });
      repository.create.mockResolvedValue(created);

      await service.create({
        title: '전체 공지',
        content: '본문',
        noticeAll: true,
      });

      expect(repository.create).toHaveBeenCalledWith({
        title: '전체 공지',
        content: '본문',
      });
      expect(eventBus.emitTyped).toHaveBeenCalledWith(
        EVENT_TOKEN.SEND_ALL_NOTIFICATION,
        {
          title: '공지사항 안내',
          body: '전체 공지가 공지사항에 추가되었습니다.\n참고해주세요.',
          data: { url: buildNoticeDeepLink(7) },
        },
      );
    });

    it('noticeAll이 true여도 channel이 있으면 이벤트를 발행하지 않는다', async () => {
      repository.create.mockResolvedValue(makeNotice({ channel: 3 }));

      await service.create({
        title: 't',
        content: 'c',
        channel: 3,
        noticeAll: true,
      });

      expect(eventBus.emitTyped).not.toHaveBeenCalled();
    });

    it('noticeAll이 없거나 false이면 이벤트를 발행하지 않는다', async () => {
      repository.create.mockResolvedValue(makeNotice({}));

      await service.create({ title: 't', content: 'c' });

      expect(eventBus.emitTyped).not.toHaveBeenCalled();
    });

    it('레포지토리가 반환한 공지를 그대로 반환한다', async () => {
      const created = makeNotice({ noticeId: 100 });
      repository.create.mockResolvedValue(created);

      await expect(service.create({ title: 'x', content: 'y' })).resolves.toBe(
        created,
      );
    });
  });

  describe('update', () => {
    it('공지가 없으면 NotFoundException', async () => {
      noticeMemberService.findById.mockResolvedValue(null);

      await expect(service.update(1, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('noticeAll이 true이고 업데이트 결과 channel이 없으면 이벤트를 발행한다', async () => {
      const found = makeNotice({ noticeId: 5 });
      noticeMemberService.findById.mockResolvedValue(found);
      repository.update.mockResolvedValue(
        createNotice({
          title: '수정된 제목',
          content: found.content,
          noticeId: 5,
          createdAt: found.createdAt,
          updatedAt: new Date(),
        }),
      );

      await service.update(5, { title: '수정된 제목', noticeAll: true });

      expect(eventBus.emitTyped).toHaveBeenCalledWith(
        EVENT_TOKEN.SEND_ALL_NOTIFICATION,
        {
          title: '공지사항 안내',
          body: '수정된 제목이 공지사항에 추가되었습니다.\n참고해주세요.',
          data: { url: buildNoticeDeepLink(5) },
        },
      );
    });

    it('noticeAll이 true여도 결과에 channel이 있으면 이벤트를 발행하지 않는다', async () => {
      const found = makeNotice({ noticeId: 5 });
      noticeMemberService.findById.mockResolvedValue(found);

      const afterUpdate = createNotice({
        title: '수정 후',
        content: found.content,
        noticeId: 5,
        channel: 99,
        createdAt: found.createdAt,
        updatedAt: new Date(),
      });

      repository.update.mockResolvedValue(afterUpdate);

      await service.update(5, { channel: 99, noticeAll: true });

      expect(eventBus.emitTyped).not.toHaveBeenCalled();
    });

    it('업데이트된 공지가 repository.update 인자로 전달된다', async () => {
      const found = makeNotice({
        noticeId: 11,
        title: '옛 제목',
        content: '옛본문',
      });
      noticeMemberService.findById.mockResolvedValue(found);
      repository.update.mockImplementation((_id, notice) =>
        Promise.resolve(notice),
      );

      await service.update(11, { title: '새 제목' });

      expect(repository.update).toHaveBeenCalledWith(
        11,
        expect.objectContaining({ title: '새 제목', content: '옛본문' }),
      );
    });
  });

  describe('remove', () => {
    it('공지가 없으면 NotFoundException', async () => {
      noticeMemberService.findById.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('공지가 있으면 repository.delete를 호출한다', async () => {
      const found = makeNotice({ noticeId: 33 });
      noticeMemberService.findById.mockResolvedValue(found);
      repository.delete.mockResolvedValue(undefined);

      await service.remove(33);

      expect(noticeMemberService.findById).toHaveBeenCalledWith(33);
      expect(repository.delete).toHaveBeenCalledWith(33);
    });
  });
});
