import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { buildNoticeDeepLink } from 'src/contracts/deep-link/deep-link';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import { NoticeAdminService } from './notice-admin.service';
import { NoticeMemberService } from './notice-member.service';
import { NoticeRepository } from '../repositories/notice.repository';
import { buildNoticeAllPushPayload } from './notice-push-notification.messages';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('NoticeAdminService (통합)', () => {
  let prisma: PrismaClient;
  let service: NoticeAdminService;
  let eventBus: { emitTyped: jest.Mock };

  const createdIds: number[] = [];
  const runId = Date.now();

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
  });

  beforeEach(() => {
    const repository = new NoticeRepository(prisma as unknown as PrismaService);
    const noticeMemberService = new NoticeMemberService(repository);
    eventBus = { emitTyped: jest.fn() };
    service = new NoticeAdminService(
      noticeMemberService,
      repository,
      eventBus as never,
    );
  });

  afterAll(async () => {
    if (!prisma) return;

    if (createdIds.length > 0) {
      await prisma.notice.deleteMany({
        where: { noticeId: { in: createdIds } },
      });
    }

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('create', () => {
    it('noticeAll이 true이고 channel이 없으면 DB에 저장하고 SEND_ALL_NOTIFICATION을 발행한다', async () => {
      const title = `통합-전체공지-${runId}`;
      const created = await service.create({
        title,
        content: '본문',
        noticeAll: true,
      });
      createdIds.push(created.noticeId!);

      const row = await prisma.notice.findUnique({
        where: { noticeId: created.noticeId },
      });
      expect(row?.title).toBe(title);
      expect(row?.channel).toBeNull();

      expect(eventBus.emitTyped).toHaveBeenCalledWith(
        EVENT_TOKEN.SEND_ALL_NOTIFICATION,
        buildNoticeAllPushPayload(created.noticeId!, title),
      );
    });

    it('noticeAll이 true여도 channel이 있으면 이벤트를 발행하지 않는다', async () => {
      const created = await service.create({
        title: `통합-채널공지-${runId}`,
        content: '채널본문',
        channel: 3,
        noticeAll: true,
      });
      createdIds.push(created.noticeId!);

      const row = await prisma.notice.findUnique({
        where: { noticeId: created.noticeId },
      });
      expect(row?.channel).toBe(3);
      expect(eventBus.emitTyped).not.toHaveBeenCalled();
    });

    it('noticeAll이 없으면 이벤트를 발행하지 않는다', async () => {
      const created = await service.create({
        title: `통합-일반공지-${runId}`,
        content: '본문',
      });
      createdIds.push(created.noticeId!);

      expect(eventBus.emitTyped).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('공지가 없으면 NotFoundException이다', async () => {
      await expect(service.update(9_999_999, { title: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('noticeAll이 true이고 결과 channel이 없으면 DB를 갱신하고 이벤트를 발행한다', async () => {
      const seed = await service.create({
        title: `통합-수정전-${runId}`,
        content: '원본',
      });
      createdIds.push(seed.noticeId!);

      const newTitle = `통합-수정후-${runId}`;
      const updated = await service.update(seed.noticeId!, {
        title: newTitle,
        noticeAll: true,
      });

      const row = await prisma.notice.findUnique({
        where: { noticeId: seed.noticeId },
      });
      expect(row?.title).toBe(newTitle);
      expect(updated.title).toBe(newTitle);

      expect(eventBus.emitTyped).toHaveBeenCalledWith(
        EVENT_TOKEN.SEND_ALL_NOTIFICATION,
        buildNoticeAllPushPayload(seed.noticeId!, newTitle),
      );
      expect(
        (eventBus.emitTyped.mock.calls[0] ?? [])[1],
      ).toEqual(
        expect.objectContaining({
          data: { url: buildNoticeDeepLink(seed.noticeId!) },
        }),
      );
    });

    it('noticeAll이 true여도 결과에 channel이 있으면 이벤트를 발행하지 않는다', async () => {
      const seed = await service.create({
        title: `통합-채널수정-${runId}`,
        content: '원본',
      });
      createdIds.push(seed.noticeId!);

      await service.update(seed.noticeId!, {
        channel: 99,
        noticeAll: true,
      });

      const row = await prisma.notice.findUnique({
        where: { noticeId: seed.noticeId },
      });
      expect(row?.channel).toBe(99);
      expect(eventBus.emitTyped).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('공지가 없으면 NotFoundException이다', async () => {
      await expect(service.remove(9_999_999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
