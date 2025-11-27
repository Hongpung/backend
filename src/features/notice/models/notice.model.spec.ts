import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { createNotice, updateNotice } from './notice.model';

describe('Notice model (공지 모델)', () => {
  const createdAtFixture = new Date('2025-01-01T00:00:00.000Z');
  const updatedAtFixture = new Date('2025-01-02T00:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers({
      advanceTimers: false,
      now: new Date('2025-06-01T12:00:00.000Z'),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createNotice', () => {
    it('필수 필드로 생성하면 값이 설정된다', () => {
      const notice = createNotice({
        noticeId: 10,
        title: '제목',
        content: '내용',
        createdAt: createdAtFixture,
        updatedAt: updatedAtFixture,
        channel: 5,
      });

      expect(notice.noticeId).toBe(10);
      expect(notice.title).toBe('제목');
      expect(notice.content).toBe('내용');
      expect(notice.createdAt).toBe(createdAtFixture);
      expect(notice.updatedAt).toBe(updatedAtFixture);
      expect(notice.channel).toBe(5);
    });

    it('channel 없이 생성하면 channel은 undefined이다', () => {
      const notice = createNotice({
        title: '제목',
        content: '내용',
        createdAt: createdAtFixture,
        updatedAt: updatedAtFixture,
      });

      expect(notice.channel).toBeUndefined();
    });
  });

  describe('updateNotice', () => {
    it('title만 전달하면 content·channel은 유지된다', () => {
      const notice = createNotice({
        title: '구제목',
        content: '구내용',
        createdAt: createdAtFixture,
        updatedAt: updatedAtFixture,
        channel: 7,
      });

      const updated = updateNotice(notice, { title: '신제목' });

      expect(updated.title).toBe('신제목');
      expect(updated.content).toBe('구내용');
      expect(updated.channel).toBe(7);
    });

    it('channel을 전달하면 덮어쓴다', () => {
      const notice = createNotice({
        title: 't',
        content: 'c',
        createdAt: createdAtFixture,
        updatedAt: updatedAtFixture,
        channel: 1,
      });

      const updated = updateNotice(notice, { channel: 99 });

      expect(updated.channel).toBe(99);
      expect(updated.title).toBe('t');
      expect(updated.content).toBe('c');
    });

    it('호출 후 updatedAt이 갱신된다', () => {
      const notice = createNotice({
        title: 't',
        content: 'c',
        createdAt: createdAtFixture,
        updatedAt: updatedAtFixture,
      });
      const before = notice.updatedAt;

      jest.setSystemTime(new Date('2025-06-02T09:30:00.000Z'));
      const updated = updateNotice(notice, {});

      expect(updated.updatedAt.getTime()).not.toBe(before.getTime());
      expect(updated.updatedAt.toISOString()).toBe('2025-06-02T18:30:00.000Z');
    });
  });
});
