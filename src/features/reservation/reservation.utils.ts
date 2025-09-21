/**
 * 예약 마감·수정 가능 여부 (한국 달력 + 실제 서울 “지금”).
 *
 * DB date/time 저장·API 표시는 {@link AppKstDateTime}을 직접 사용한다.
 * 이 유틸은 **예약일 전날 22:00 KST 마감** 같은 비즈니스 규칙만 담는다.
 *
 * @see docs/convention/hexagonal-15-time-convention.md
 */
import dayjs from 'dayjs';
import {
  AppKstDateTime,
  KST_TIMEZONE,
} from 'src/common/time-format/app-kst-datetime';

/**
 * 예약 생성·변경 마감 및 KST 달력 판정.
 * `getCurrentKST`·`getReservationDeadline`은 **실제 KST instant**(`dayjs.tz` → epoch)이며,
 * {@link AppKstDateTime.getNowKoreanTime} 벽시각 앵커와는 비교 축이 다르다.
 */
export class ReservationTimeUtil {
  /** 예약 마감 시각 — 예약일 전날 이 시각(KST)까지 생성·변경 가능 */
  private static readonly DEADLINE_HOUR = 22;

  /**
   * 예약일 기준 마감 시각을 반환한다.
   * 규칙: **예약일 전날 22:00 KST** (실제 UTC epoch).
   *
   * @param reservationDate - `YYYY-MM-DD` 또는 DB date 앵커 `Date`
   */
  static getReservationDeadline(reservationDate: string | Date): Date {
    const ymd = AppKstDateTime.kstCalendarYmdFromDbOrString(reservationDate);
    return dayjs
      .tz(`${ymd} 00:00:00`, 'YYYY-MM-DD HH:mm:ss', KST_TIMEZONE)
      .subtract(1, 'day')
      .hour(this.DEADLINE_HOUR)
      .minute(0)
      .second(0)
      .millisecond(0)
      .toDate();
  }

  /**
   * 현재 시각을 KST 기준 실제 instant `Date`로 반환한다.
   * 마감 비교(`canMakeReservation` 등)에 사용.
   */
  static getCurrentKST(): Date {
    return dayjs().tz(KST_TIMEZONE).toDate();
  }

  /**
   * 해당 예약일에 대해 아직 생성(신청) 가능한지 여부.
   * @returns 마감 전이면 `true`
   */
  static canMakeReservation(reservationDate: string | Date): boolean {
    const now = this.getCurrentKST();
    const deadline = this.getReservationDeadline(reservationDate);
    return now.getTime() <= deadline.getTime();
  }

  /**
   * 예약 변경이 허용되는지 여부.
   * 현재 예약일 마감을 지났으면 `false`. `newReservationDate`가 있으면 그 날짜 마감도 함께 검사.
   *
   * @param currentReservationDate - 변경 대상 예약의 날짜
   * @param newReservationDate - 변경 후 날짜(선택)
   */
  static canModifyReservation(
    currentReservationDate: string | Date,
    newReservationDate?: string | Date,
  ): boolean {
    const now = this.getCurrentKST();
    const currentDeadline = this.getReservationDeadline(currentReservationDate);
    if (now.getTime() > currentDeadline.getTime()) return false;
    if (newReservationDate) {
      const newDeadline = this.getReservationDeadline(newReservationDate);
      if (now.getTime() > newDeadline.getTime()) return false;
    }
    return true;
  }

  /**
   * 예약일 마감 시각까지 남은 분 수.
   * 마감이 지났으면 음수.
   */
  static getMinutesUntilDeadline(reservationDate: string | Date): number {
    const now = this.getCurrentKST();
    const deadline = this.getReservationDeadline(reservationDate);
    return dayjs(deadline).diff(dayjs(now), 'minute');
  }

  /**
   * 예약 날짜가 KST 달력 기준 **오늘**인지 여부.
   * `reservationDate`는 {@link AppKstDateTime.kstCalendarYmdFromDbOrString} 규약으로 해석.
   */
  static isToday(reservationDate: string | Date): boolean {
    const targetYmd = AppKstDateTime.kstCalendarYmdFromDbOrString(reservationDate);
    return targetYmd === AppKstDateTime.kstTodayYmd();
  }

  /**
   * 예약 날짜가 KST 달력 기준 **내일**인지 여부.
   */
  static isTomorrow(reservationDate: string | Date): boolean {
    const targetYmd = AppKstDateTime.kstCalendarYmdFromDbOrString(reservationDate);
    return targetYmd === AppKstDateTime.kstTomorrowYmd();
  }
}
