import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

/**
 * @deprecated 신규 코드는 {@link AppKstDateTime} 직접 사용.
 * 세션 feature 레거시 호환 래퍼.
 */
export class SessionAppKstUtil {
  static utcToKstShiftedDate(utc: Date): Date {
    return AppKstDateTime.wallClockAnchorFromInstant(utc);
  }

  static nowKstShiftedDate(): Date {
    return AppKstDateTime.getNowKoreanTime();
  }

  static getKstHourFromUtc(utc: Date): number {
    return AppKstDateTime.kstHourFromInstant(utc);
  }

  static kstShiftedCalendarYmdFromUtc(utc: Date): string {
    return AppKstDateTime.kstCalendarYmdFromInstant(utc);
  }

  static kstShiftedTodayYmd(): string {
    return AppKstDateTime.kstTodayYmd();
  }
}
