import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import type { ReservationSession } from '../entities/reservation-session.entity';
import type { RealtimeSession } from '../entities/realtime-session.entity';
import {
  ATTENDANCE_ON_TIME_AFTER_START_COMPENSATED_MS,
  ATTENDANCE_ON_TIME_AFTER_START_MS,
  RESERVATION_DISCARD_GRACE_COMPENSATED_MS,
  RESERVATION_DISCARD_GRACE_MS,
  RESERVATION_EARLY_START_MS,
  STARTABLE_WINDOW_BEFORE_MS,
  STARTABLE_WINDOW_LATE_BOUND_COMP_MS,
  STARTABLE_WINDOW_LATE_BOUND_MS,
} from '../session.constant';

/**
 * 예약 슬롯 시작 시각·보상 유예·no-show 마감·체크인 시작 창을 한곳에서 판단한다.
 */
export class ReservationStartWindowPolicy {
  /** DB/캐시에 저장된 예약 슬롯 시작 시각(HH:mm) */
  static plannedSlotTime(r: ReservationSession): string {
    return r.plannedSlotStartHHmm;
  }

  static plannedStartMs(r: ReservationSession): number {
    return AppKstDateTime.parseKstDateTime(r.date, this.plannedSlotTime(r)).getTime();
  }

  /**
   * 이전 onair 세션이 예약자의 선시작 구간을 침범하면 보상 유예.
   * 선시작 구간: [plannedStart - 10분, plannedStart)
   */
  static compensationApplies(args: {
    currentOnAir: RealtimeSession | ReservationSession | null;
    nextReservation: ReservationSession;
  }): boolean {
    const { currentOnAir, nextReservation } = args;
    if (!currentOnAir || currentOnAir.status !== 'ONAIR') {
      return false;
    }
    const reservedStartMs = this.plannedStartMs(nextReservation);
    const earlyWindowStartMs = reservedStartMs - RESERVATION_EARLY_START_MS;
    const onAirEndMs = AppKstDateTime.parseKstDateTime(
      currentOnAir.date,
      currentOnAir.endTime,
    ).getTime();
    return onAirEndMs > earlyWindowStartMs;
  }

  static graceAfterStartMs(compensation: boolean): number {
    return compensation
      ? RESERVATION_DISCARD_GRACE_COMPENSATED_MS
      : RESERVATION_DISCARD_GRACE_MS;
  }

  /**
   * gapMs = plannedStartMs - nowMs
   * stale: now가 슬롯 시작 + 유예를 초과
   */
  static isStale(args: {
    plannedStartMs: number;
    nowMs: number;
    compensation: boolean;
  }): boolean {
    const deadline =
      args.plannedStartMs + this.graceAfterStartMs(args.compensation);
    return args.nowMs > deadline;
  }

  static isInStartableWindow(args: {
    gapMs: number;
    compensation: boolean;
  }): boolean {
    const lateBound = args.compensation
      ? STARTABLE_WINDOW_LATE_BOUND_COMP_MS
      : STARTABLE_WINDOW_LATE_BOUND_MS;
    return args.gapMs < STARTABLE_WINDOW_BEFORE_MS && args.gapMs > lateBound;
  }

  static onTimeAttendanceThresholdMs(compensation: boolean): number {
    return compensation
      ? ATTENDANCE_ON_TIME_AFTER_START_COMPENSATED_MS
      : ATTENDANCE_ON_TIME_AFTER_START_MS;
  }
}
