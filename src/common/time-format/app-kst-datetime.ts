/**
 * 앱 전역 KST·DB date/time 규약.
 * @see docs/convention/hexagonal-15-time-convention.md
 */
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const YMD_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const WALL_TIME_EPOCH_ANCHOR_YEAR = 1970;

/** IANA 타임존 — `ReservationTimeUtil` 등에서 사용 */
export const KST_TIMEZONE = 'Asia/Seoul' as const;

/**
 * DB·API·스케줄러용 KST 시간 규약.
 *
 * - **저장(벽시각 앵커)**: 날짜 `2026-04-25T00:00:00.000Z`, 시각 `1970-01-01T12:00:00.000Z`
 * - **실제 순간**: `parseKstDateTime` / `msUntilKstWallInstant` ↔ `Date.now()`
 * - **앵커끼리 비교**: `getNowKoreanTime()` ↔ DB `Date` `.getTime()`
 */
export class AppKstDateTime {
  static readonly KST_TIMEZONE = KST_TIMEZONE;

  /**
   * DB date 앵커 또는 `YYYY-MM-DD` 문자열 → 달력 `YYYY-MM-DD`.
   * KST `tz()` 재해석 없이 UTC 컴포넌트(벽시각 숫자)를 그대로 쓴다.
   */
  static kstCalendarYmdFromDbOrString(input: string | Date): string {
    if (typeof input === 'string' && YMD_ONLY.test(input.trim())) {
      return input.trim();
    }
    const d =
      input instanceof Date ? dayjs.utc(input) : dayjs.utc(input as string);
    if (!d.isValid()) {
      throw new RangeError(`Invalid date: ${String(input)}`);
    }
    return d.format('YYYY-MM-DD');
  }

  /** KST 달력 기준 오늘 `YYYY-MM-DD`. */
  static kstTodayYmd(now: Date = new Date()): string {
    return dayjs(now).tz(this.KST_TIMEZONE).format('YYYY-MM-DD');
  }

  /** KST 달력 기준 내일 `YYYY-MM-DD`. */
  static kstTomorrowYmd(now: Date = new Date()): string {
    return dayjs(now).tz(this.KST_TIMEZONE).add(1, 'day').format('YYYY-MM-DD');
  }

  /** 실제 instant → KST 달력 `YYYY-MM-DD`. */
  static kstCalendarYmdFromInstant(instant: Date): string {
    return dayjs(instant).tz(this.KST_TIMEZONE).format('YYYY-MM-DD');
  }

  /** 실제 instant → KST 시(0–23). */
  static kstHourFromInstant(instant: Date): number {
    return dayjs(instant).tz(this.KST_TIMEZONE).hour();
  }

  /** 실제 instant → KST 벽시각 `HH:mm` (실시간 세션·체크인 등). */
  static kstHHmmFromInstant(instant: Date): string {
    return dayjs(instant).tz(this.KST_TIMEZONE).format('HH:mm');
  }

  /**
   * 실제 instant를 벽시각 앵커 `Date`로 변환.
   * UTC `Z`에 KST 시·분·초 숫자를 올린다(저장 규약과 동일 축).
   */
  static wallClockAnchorFromInstant(instant: Date): Date {
    const wall = dayjs(instant)
      .tz(this.KST_TIMEZONE)
      .format('YYYY-MM-DD HH:mm:ss');
    return dayjs.utc(wall, 'YYYY-MM-DD HH:mm:ss').toDate();
  }

  /**
   * KST 날짜+시각의 실제 epoch까지 남은 ms.
   * Bull 지연·만료·알림 등 `Date.now()`와 비교할 때 사용.
   */
  static msUntilKstWallInstant(
    dateYmd: string,
    timeHHmm: string,
    nowMs: number = Date.now(),
  ): number {
    return this.parseKstDateTime(dateYmd, timeHHmm).getTime() - nowMs;
  }

  /** KST 오늘 → DB `date` 컬럼용 `YYYY-MM-DDT00:00:00.000Z`. */
  static todayDateAnchorForDb(now: Date = new Date()): Date {
    return this.dateFormmatForDB(this.kstTodayYmd(now));
  }

  /** KST 내일 → DB `date` 컬럼용 `YYYY-MM-DDT00:00:00.000Z`. */
  static tomorrowDateAnchorForDb(now: Date = new Date()): Date {
    return this.dateFormmatForDB(this.kstTomorrowYmd(now));
  }

  /**
   * 현재 KST 벽시각을 DB time 앵커와 동일 규약의 `Date`로 반환.
   * 출석 타임스탬프·DB time과 `.getTime()` 비교 시 사용.
   */
  static getNowKoreanTime(): Date {
    const wall = dayjs().tz(this.KST_TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    return dayjs.utc(wall, 'YYYY-MM-DD HH:mm:ss').toDate();
  }

  /**
   * 예약·세션 시각 문자열을 `HH:mm`으로 정규화(초 제거).
   * @throws {RangeError} 형식·범위가 잘못된 경우
   */
  static normalizeReservationTimeToHHmm(time: string): string {
    const trimmed = time.trim();
    const parts = trimmed.split(':').map((s) => parseInt(s, 10));
    if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) {
      throw new RangeError(`Invalid time: ${time}`);
    }
    const h = parts[0];
    const m = parts[1];
    const s = parts[2] ?? 0;
    if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) {
      throw new RangeError(`Invalid time: ${time}`);
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * DB time 앵커 `Date` → API 응답 `HH:mm`.
   * `tz()` 변환 없이 UTC 컴포넌트를 그대로 읽는다.
   */
  static timeFormmatForClient(time: Date): string {
    return dayjs.utc(time).format('HH:mm');
  }

  /**
   * 벽시각 앵커 `Date` → 와이어/캐시용 `YYYY-MM-DDTHH:mm` (초 없음).
   */
  static dateTimeFormmatForClient(date: Date): string {
    return dayjs.utc(date).format('YYYY-MM-DDTHH:mm');
  }

  /**
   * 큐·스냅샷·API 혼합 입력 → `HH:mm`.
   * `HH:mm` 문자열, ISO, DB time `Date` 모두 허용.
   */
  static deserializeReservationTimeToHHmm(value: string | Date): string {
    if (typeof value !== 'string') {
      return this.timeFormmatForClient(value);
    }
    const t = value.trim();
    if (/^\d{1,2}:\d{2}/.test(t)) {
      return this.normalizeReservationTimeToHHmm(
        t.length >= 8 ? t.slice(0, 8) : t.slice(0, 5),
      );
    }
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) {
      return this.timeFormmatForClient(d);
    }
    return this.normalizeReservationTimeToHHmm(t);
  }

  /**
   * `HH:mm` 또는 `Date` → DB time 앵커 `1970-01-01THH:mm:00.000Z`.
   */
  static timeFormmatForDB(time: string | Date): Date {
    if (typeof time === 'string') {
      const hm = this.normalizeReservationTimeToHHmm(time);
      return dayjs.utc(`1970-01-01T${hm}:00`, 'YYYY-MM-DDTHH:mm:ss').toDate();
    }
    const u = dayjs.utc(time);
    if (
      u.year() === WALL_TIME_EPOCH_ANCHOR_YEAR &&
      u.month() === 0 &&
      u.date() === 1
    ) {
      return u.toDate();
    }
    const wall = dayjs(time).tz(this.KST_TIMEZONE).format('HH:mm:ss');
    return dayjs.utc(`1970-01-01T${wall}`, 'YYYY-MM-DDTHH:mm:ss').toDate();
  }

  /**
   * `YYYY-MM-DD` 또는 date 앵커 `Date` → DB date `YYYY-MM-DDT00:00:00.000Z`.
   */
  static dateFormmatForDB(date: string): Date;
  static dateFormmatForDB(date: Date): Date;
  static dateFormmatForDB(date: string | Date): Date {
    if (typeof date === 'string') {
      return dayjs.utc(date, 'YYYY-MM-DD').startOf('day').toDate();
    }
    const ymd = this.kstCalendarYmdFromDbOrString(date);
    return dayjs.utc(ymd, 'YYYY-MM-DD').startOf('day').toDate();
  }

  /**
   * KST 벽시각(날짜+시각) → 실제 UTC epoch `Date`.
   * 예: `('2026-04-25','12:00')` → `2026-04-25T03:00:00.000Z`
   */
  static parseKstDateTime(dateStr: string, timeStr: string): Date {
    const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
    return dayjs
      .tz(`${dateStr} ${normalized}`, 'YYYY-MM-DD HH:mm:ss', this.KST_TIMEZONE)
      .toDate();
  }
}
