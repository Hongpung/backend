import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { AppKstDateTime } from './app-kst-datetime';

describe('AppKstDateTime', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('DB wall-clock anchors', () => {
    it('dateFormmatForDB stores YMD at UTC midnight Z', () => {
      expect(AppKstDateTime.dateFormmatForDB('2026-04-25').toISOString()).toBe(
        '2026-04-25T00:00:00.000Z',
      );
    });

    it('timeFormmatForDB stores HH:mm on 1970-01-01 Z', () => {
      expect(AppKstDateTime.timeFormmatForDB('12:00').toISOString()).toBe(
        '1970-01-01T12:00:00.000Z',
      );
    });

    it('timeFormmatForClient reads wall HH:mm without KST tz shift', () => {
      const dbTime = AppKstDateTime.timeFormmatForDB('12:00');
      expect(AppKstDateTime.timeFormmatForClient(dbTime)).toBe('12:00');
    });
  });

  describe('parseKstDateTime vs wall anchor', () => {
    it('parseKstDateTime is real KST instant (12:00 KST → 03:00Z)', () => {
      const instant = AppKstDateTime.parseKstDateTime('2026-04-25', '12:00');
      expect(instant.toISOString()).toBe('2026-04-25T03:00:00.000Z');
    });

    it('msUntilKstWallInstant compares against Date.now()', () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      jest.setSystemTime(new Date('2026-04-25T02:00:00.000Z'));

      const ms = AppKstDateTime.msUntilKstWallInstant('2026-04-25', '12:00');
      expect(ms).toBe(60 * 60 * 1000);
    });
  });

  describe('getNowKoreanTime', () => {
    it('matches KST wall components on Z (not real UTC instant)', () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      jest.setSystemTime(new Date('2026-04-25T03:00:00.000Z'));

      const anchor = AppKstDateTime.getNowKoreanTime();
      expect(anchor.toISOString()).toBe('2026-04-25T12:00:00.000Z');
    });
  });

  describe('kstTodayYmd / scheduler date anchors', () => {
    it('kstTodayYmd follows KST calendar', () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      jest.setSystemTime(new Date('2026-04-25T15:00:00.000Z'));

      expect(AppKstDateTime.kstTodayYmd()).toBe('2026-04-26');
    });

    it('todayDateAnchorForDb uses DB date anchor', () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      jest.setSystemTime(new Date('2026-04-25T15:00:00.000Z'));

      expect(AppKstDateTime.todayDateAnchorForDb().toISOString()).toBe(
        '2026-04-26T00:00:00.000Z',
      );
    });
  });
});
