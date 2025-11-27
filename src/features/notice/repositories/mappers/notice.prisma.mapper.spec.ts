import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { Notice, Prisma } from '@prisma/client';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { NoticeRepositoryMapper } from './notice.prisma.mapper';
import { createNotice } from '../../models/notice.model';

describe('NoticeRepositoryMapper (Prisma 레코드 ↔ 모델)', () => {
  const fixedRowBase = (): Notice => ({
    noticeId: 1,
    title: '공지 제목',
    content: '공지 내용',
    createdAt: new Date('2024-06-01T00:00:00.000Z'),
    updatedAt: new Date('2024-06-02T00:00:00.000Z'),
    channel: null,
  });

  describe('toModel', () => {
    it('channel이 null이면 모델 channel은 undefined이다', () => {
      const row = fixedRowBase();

      const notice = NoticeRepositoryMapper.toModel(row);

      expect(notice.channel).toBeUndefined();
      expect(notice.noticeId).toBe(1);
      expect(notice.title).toBe('공지 제목');
      expect(notice.content).toBe('공지 내용');
    });

    it('channel이 설정되면 모델에 그대로 반영된다', () => {
      const notice = NoticeRepositoryMapper.toModel({
        ...fixedRowBase(),
        channel: 1,
      });

      expect(notice.channel).toBe(1);
    });
  });

  describe('toCreateInput', () => {
    const kstNowFixture = new Date('2026-05-09T09:00:00.000Z');

    beforeEach(() => {
      jest.spyOn(AppKstDateTime, 'getNowKoreanTime').mockReturnValue(kstNowFixture);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('channel 인자 없으면 입력에 channel: null이다', () => {
      const input = NoticeRepositoryMapper.toCreateInput({
        title: 't',
        content: 'c',
      });

      expect(input).toEqual({
        title: 't',
        content: 'c',
        channel: null,
        createdAt: kstNowFixture,
        updatedAt: kstNowFixture,
      });
    });

    it('channel이 있으면 동일하게 들어간다', () => {
      const input = NoticeRepositoryMapper.toCreateInput(
        { title: 't', content: 'c' },
        2,
      );

      expect(input.channel).toBe(2);
    });
  });

  describe('toUpdateInput', () => {
    it('제목·본문·channel이 있는 공지면 모두 포함된다', () => {
      const notice = createNotice({
        noticeId: 1,
        title: 'a',
        content: 'b',
        channel: 3,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-03T00:00:00.000Z'),
      });

      const input = NoticeRepositoryMapper.toUpdateInput(notice);

      expect(input.title).toBe('a');
      expect(input.content).toBe('b');
      expect(input.channel).toBe(3);
      expect(input.updatedAt).toEqual(notice.updatedAt);
    });

    it('channel이 없는 공지면 channel에는 Prisma.skip이 들어간다', () => {
      const notice = createNotice({
        noticeId: 1,
        title: 'z',
        content: 'y',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const input = NoticeRepositoryMapper.toUpdateInput(notice);

      expect(input.channel).toBe(Prisma.skip);
    });
  });
});
