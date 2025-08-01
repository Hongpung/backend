export const BASIC_TIME_INTERVAL = 30 * 60 * 1000;

/** KST 오프셋 (밀리초) */
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 세션 종료 N분 전 알람 (밀리초) */
export const ALARM_BEFORE_END_MS = 10 * 60 * 1000;

/** 세션 수동 종료 가능: 시작 후 N분 지나야 종료 가능 (밀리초) */
export const END_SESSION_MIN_ELAPSED_MS = 15 * 60 * 1000;

/** 세션 연장 가능: 종료까지 N분 이상 남아있어야 연장 가능 (밀리초) */
export const EXTEND_SESSION_MIN_REMAINING_MS = 15 * 60 * 1000;

/** 실시간 세션 생성 가능: 다음 예약까지 N분 이상 여유 (밀리초) */
export const CREATABLE_MIN_GAP_MS = 40 * 60 * 1000;

/** 예약 세션 시작 가능: 시작 N분 전~시작 후 N분 (밀리초) */
export const STARTABLE_WINDOW_BEFORE_MS = 10 * 60 * 1000;
export const STARTABLE_WINDOW_AFTER_MS = -10 * 60 * 1000;

/** 예약 미시작 시 폐기: 시작 후 N분 (밀리초) */
export const RESERVATION_DISCARD_GRACE_MS = 10 * 60 * 1000;

/** 출석/지각 판정: 세션 시작 시각으로부터 이 diff(ms) 이내면 출석, 초과면 지각 */
export const ATTENDANCE_LATE_THRESHOLD_MS = 10 * 60 * 1000 + 59 * 1000;

/** 연습실 사용 시간: 시작 시간 */
export const OPEN_HOUR = 10;

/** 연습실 사용 시간: 종료 시간 */
export const CLOSE_HOUR = 22;