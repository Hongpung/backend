import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import { NoticeRepository } from './notice.repository';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { createNotice } from '../models/notice.model';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('NoticeRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: NoticeRepository;
  const createdIds: number[] = [];

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new NoticeRepository(prisma as unknown as PrismaService);
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

  describe('findAll', () => {
    it('channel이 null인 공지만 createdAt 내림차순으로 반환한다', async () => {
      const global = await repository.create({
        title: `통합-전체-${Date.now()}`,
        content: '본문',
      });
      createdIds.push(global.noticeId!);

      const channelOnly = await prisma.notice.create({
        data: {
          title: `통합-채널-${Date.now()}`,
          content: '채널공지',
          channel: 99,
        },
      });
      createdIds.push(channelOnly.noticeId);

      const list = await repository.findAll();

      expect(list.some((n) => n.noticeId === global.noticeId)).toBe(true);
      expect(list.some((n) => n.noticeId === channelOnly.noticeId)).toBe(false);

      const idxGlobal = list.findIndex((n) => n.noticeId === global.noticeId);
      if (idxGlobal > 0) {
        expect(list[idxGlobal - 1]!.createdAt.getTime()).toBeGreaterThanOrEqual(
          list[idxGlobal]!.createdAt.getTime(),
        );
      }
    });
  });

  describe('findById', () => {
    it('존재하지 않는 noticeId면 null을 반환한다', async () => {
      const result = await repository.findById(9_999_999_999);
      expect(result).toBeNull();
    });

    it('존재하는 noticeId면 모델을 반환한다', async () => {
      const created = await repository.create({
        title: `통합-조회-${Date.now()}`,
        content: '상세',
      });
      createdIds.push(created.noticeId!);

      const found = await repository.findById(created.noticeId!);

      expect(found).not.toBeNull();
      expect(found!.noticeId).toBe(created.noticeId);
      expect(found!.title).toBe(created.title);
      expect(found!.content).toBe(created.content);
    });
  });

  describe('create', () => {
    it('공지를 생성하고 모델로 반환한다', async () => {
      const title = `통합-생성-${Date.now()}`;
      const created = await repository.create({
        title,
        content: '새 공지',
        channel: 5,
      });
      createdIds.push(created.noticeId!);

      expect(created.title).toBe(title);
      expect(created.channel).toBe(5);

      const row = await prisma.notice.findUnique({
        where: { noticeId: created.noticeId },
      });
      expect(row?.channel).toBe(5);
    });
  });

  describe('update', () => {
    it('공지 필드를 갱신한다', async () => {
      const created = await repository.create({
        title: `통합-수정전-${Date.now()}`,
        content: '원본',
      });
      createdIds.push(created.noticeId!);

      const toUpdate = createNotice({
        ...created,
        title: `통합-수정후-${Date.now()}`,
        updatedAt: new Date(),
      });

      const updated = await repository.update(created.noticeId!, toUpdate);

      expect(updated.title).toBe(toUpdate.title);

      const row = await prisma.notice.findUnique({
        where: { noticeId: created.noticeId },
      });
      expect(row?.title).toBe(toUpdate.title);
    });
  });

  describe('delete', () => {
    it('공지를 삭제한다', async () => {
      const created = await repository.create({
        title: `통합-삭제-${Date.now()}`,
        content: '삭제대상',
      });
      const id = created.noticeId!;

      await repository.delete(id);

      const row = await prisma.notice.findUnique({ where: { noticeId: id } });
      expect(row).toBeNull();
    });
  });
});
