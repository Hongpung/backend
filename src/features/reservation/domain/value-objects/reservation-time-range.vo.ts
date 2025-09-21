import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

function secondsFromMidnight(hhmm: string): number {
  const n = AppKstDateTime.normalizeReservationTimeToHHmm(hhmm);
  const [h, m] = n.split(':').map(Number);
  return h * 3600 + m * 60;
}

/**
 * 같은 날짜 안에서의 예약 시간 구간 (엔티티는 `HH:mm` 문자열로 보관)
 */
export class ReservationTimeRange {
  private readonly _startTime: string;
  private readonly _endTime: string;

  private constructor(startTime: string, endTime: string) {
    this._startTime = AppKstDateTime.normalizeReservationTimeToHHmm(startTime);
    this._endTime = AppKstDateTime.normalizeReservationTimeToHHmm(endTime);
    const s = secondsFromMidnight(this._startTime);
    const e = secondsFromMidnight(this._endTime);
    if (e <= s) {
      throw new Error('endTime must be after startTime');
    }
  }

  static create(startTime: string, endTime: string): ReservationTimeRange {
    return new ReservationTimeRange(startTime, endTime);
  }

  get startTime(): string {
    return this._startTime;
  }

  get endTime(): string {
    return this._endTime;
  }

  isOverlapping(other: ReservationTimeRange): boolean {
    const s1 = secondsFromMidnight(this._startTime);
    const e1 = secondsFromMidnight(this._endTime);
    const s2 = secondsFromMidnight(other._startTime);
    const e2 = secondsFromMidnight(other._endTime);
    return s1 < e2 && e1 > s2;
  }

  isSameTime(other: ReservationTimeRange): boolean {
    return (
      this._startTime === other._startTime && this._endTime === other._endTime
    );
  }

  isSameTimeRange(other: ReservationTimeRange): boolean {
    return this.isSameTime(other);
  }
}
