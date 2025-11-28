export const BASIC_TIME_INTERVAL = 30 * 60 * 1000;

/** 세션 종료 N분 전 알람 (밀리초) */
export const ALARM_BEFORE_END_MS = 10 * 60 * 1000;

/** 세션 수동 종료 가능: 시작 후 N분 지나야 종료 가능 (밀리초) */
export const END_SESSION_MIN_ELAPSED_MS = 15 * 60 * 1000;

/** 세션 연장 가능: 종료까지 N분 이상 남아있어야 연장 가능 (밀리초) */
export const EXTEND_SESSION_MIN_REMAINING_MS = 15 * 60 * 1000;

/** 실시간 세션 생성 가능: 다음 예약까지 N분 이상 여유 (밀리초) */
export const CREATABLE_MIN_GAP_MS = 40 * 60 * 1000;

/** 예약 세션 시작 가능: 시작 전 최대 허용( gap = startMs - now ) */
export const STARTABLE_WINDOW_BEFORE_MS = 10 * 60 * 1000;
/** gap > 이 값일 때까지 “시작 지각 허용” (음수 = 시작 후 과거 허용) */
export const STARTABLE_WINDOW_LATE_BOUND_MS = -10 * 60 * 1000;
/** 보상 유예 적용 시 시작 지각 허용 끝 */
export const STARTABLE_WINDOW_LATE_BOUND_COMP_MS = -15 * 60 * 1000;

/** 예약 미시작 시 폐기: 시작 후 N분 (밀리초) — 기본 */
export const RESERVATION_DISCARD_GRACE_MS = 10 * 60 * 1000;

/** 예약 미시작 시 폐기: 보상 유예 적용 예약 시작 후 N분까지 */
export const RESERVATION_DISCARD_GRACE_COMPENSATED_MS = 15 * 60 * 1000;

/** 출석 선시작 구간: 예약 시작 N분 전 (밀리초) — 보상 적용 여부 판별에 사용 */
export const RESERVATION_EARLY_START_MS = 10 * 60 * 1000;

/** 출석/지각 판정: 예약 시작(슬롯) 기준, 기본 허용 delay */
export const ATTENDANCE_ON_TIME_AFTER_START_MS = 10 * 60 * 1000;

/** 출석/지각 판정: 보상 유예 시 예약 슬롯 시작 후 허용 delay */
export const ATTENDANCE_ON_TIME_AFTER_START_COMPENSATED_MS = 15 * 60 * 1000;

/** 연습실 사용 시간: 시작 시간 */
export const OPEN_HOUR = 10;

/** 연습실 사용 시간: 종료 시간 */
export const CLOSE_HOUR = 22;
