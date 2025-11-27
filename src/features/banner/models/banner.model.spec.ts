import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import {
  createBanner,
  isAfterPost,
  isBeforePost,
  isOnPost,
} from './banner.model';

function makeBanner(startDate: Date, endDate: Date) {
  return createBanner({
    owner: 'owner-1',
    bannerImgUrl: 'https://example.com/b.png',
    href: null,
    startDate,
    endDate,
  });
}

describe('배너 모델', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('게시 기간 판별', () => {
    it('현재 시각이 시작일과 종료일 사이면 게시 중이다', () => {
      jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
      const banner = makeBanner(
        AppKstDateTime.dateFormmatForDB('2024-06-01'),
        AppKstDateTime.dateFormmatForDB('2024-06-30'),
      );

      expect(isOnPost(banner)).toBe(true);
      expect(isBeforePost(banner)).toBe(false);
      expect(isAfterPost(banner)).toBe(false);
    });

    it('시작일 이전이면 게시 전이다', () => {
      jest.setSystemTime(new Date('2024-05-01T00:00:00.000Z'));
      const banner = makeBanner(
        AppKstDateTime.dateFormmatForDB('2024-06-01'),
        AppKstDateTime.dateFormmatForDB('2024-06-30'),
      );

      expect(isBeforePost(banner)).toBe(true);
      expect(isOnPost(banner)).toBe(false);
      expect(isAfterPost(banner)).toBe(false);
    });

    it('종료일 이후면 게시 종료 후이다', () => {
      jest.setSystemTime(new Date('2024-07-05T00:00:00.000Z'));
      const banner = makeBanner(
        AppKstDateTime.dateFormmatForDB('2024-06-01'),
        AppKstDateTime.dateFormmatForDB('2024-06-30'),
      );

      expect(isAfterPost(banner)).toBe(true);
      expect(isOnPost(banner)).toBe(false);
      expect(isBeforePost(banner)).toBe(false);
    });

    it('KST 달력상 오늘이 시작일이면 게시 중이다', () => {
      jest.setSystemTime(new Date('2024-06-01T08:30:00.000Z'));
      const banner = makeBanner(
        AppKstDateTime.dateFormmatForDB('2024-06-01'),
        AppKstDateTime.dateFormmatForDB('2024-06-30'),
      );

      expect(isOnPost(banner)).toBe(true);
      expect(isBeforePost(banner)).toBe(false);
    });

    it('KST 달력상 오늘이 종료일이면 게시 중이다', () => {
      jest.setSystemTime(new Date('2024-06-30T10:00:00.000Z'));
      const banner = makeBanner(
        AppKstDateTime.dateFormmatForDB('2024-06-01'),
        AppKstDateTime.dateFormmatForDB('2024-06-30'),
      );

      expect(isOnPost(banner)).toBe(true);
      expect(isAfterPost(banner)).toBe(false);
    });

    it('KST 달력상 종료일 다음 날이면 게시 종료 후이다', () => {
      jest.setSystemTime(new Date('2024-07-01T00:00:00.000Z'));
      const banner = makeBanner(
        AppKstDateTime.dateFormmatForDB('2024-06-01'),
        AppKstDateTime.dateFormmatForDB('2024-06-30'),
      );

      expect(isAfterPost(banner)).toBe(true);
      expect(isOnPost(banner)).toBe(false);
    });

    it('정상 기간에서는 게시 중·전·후 플래그가 동시에 true가 되지 않는다', () => {
      jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
      const banner = makeBanner(
        AppKstDateTime.dateFormmatForDB('2024-06-01'),
        AppKstDateTime.dateFormmatForDB('2024-06-30'),
      );

      const flags = [
        isOnPost(banner),
        isBeforePost(banner),
        isAfterPost(banner),
      ].filter(Boolean);
      expect(flags.length).toBe(1);
    });
  });
});
