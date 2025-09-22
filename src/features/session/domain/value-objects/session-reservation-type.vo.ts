/**
 * Session 도메인에서 사용하는 예약 타입
 * - reservation.types.ReservationType으로부터 분리되어 session의 독립적인 타입으로 정의
 */

export const SESSION_RESERVATION_TYPES = [
  'REGULAR',
  'COMMON',
  'EXTERNAL',
] as const;
export type SessionReservationType = (typeof SESSION_RESERVATION_TYPES)[number];
