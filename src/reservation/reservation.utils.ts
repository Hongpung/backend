const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 임의 시각을 KST HH:mm 문자열로 변환 (실시간 세션 등 "지금" 시각 표기용)
 */
export function getKoreanTimeString(date: Date): string {
    const kst = new Date(date.getTime() + KST_OFFSET_MS);
    const h = kst.getUTCHours();
    const m = kst.getUTCMinutes();
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** 현재 시각 KST HH:mm */
export function getNowKoreanTime(): Date {
    return new Date(Date.now() + KST_OFFSET_MS);
}

/**
 * 클라이언트 반환을 위한 포맷
 * @param time DB에서 읽은 Date (1970-01-01, +9(KST)로 저장된 값 → 시·분이 이미 KST)
 * @returns HH:mm (저장된 KST 그대로)
 */
export function timeFormmatForClient(time: Date): string {
    const h = time.getUTCHours();
    const m = time.getUTCMinutes();
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * 예약 등 time 필드를 Z 그대로 반환할 때 사용
 * @param time DB에서 읽은 Date (+9(KST)로 저장된 1970-01-01 시각)
 * @returns ISO 8601 문자열 (예: 1970-01-01T14:00:00.000Z)
 */
export function timeFormmatForClientAsZ(time: Date): string {
    return time.toISOString();
}

/**
 * DB 삽입용: HH:mm (KST) 또는 Date → 1970-01-01T{시각}Z
 * +9(KST) 그대로 저장. 시·분을 그대로 넣어 toISOString() 시 …Z 형태로 저장.
 * @param time HH:mm(ss) 문자열 (KST) 또는 Date(해당 시각의 KST 시·분으로 저장)
 * @returns Date (1970-01-01, 시각은 KST 그대로 Z 형식)
 */
export function timeFormmatForDB(time: string | Date): Date {
    if (typeof time === 'string') {
        const normalized = time.length === 5 ? `${time}:00` : time;
        const [h, m, s = 0] = normalized.split(':').map(Number);
        return new Date(Date.UTC(1970, 0, 1, h, m, s, 0));
    }
    const kst = new Date(time.getTime() + KST_OFFSET_MS);
    const h = kst.getUTCHours();
    const m = kst.getUTCMinutes();
    const s = kst.getUTCSeconds();
    return new Date(Date.UTC(1970, 0, 1, h, m, s, 0));
}


/**
 * DB삽입을 위한 포맷
 * @param dateString yyyy-mm-dd 포맷
 * @returns Date
 */
export function dateFormmatForDB(date: string): Date {
    const formmatedDate = new Date(`${date}T00:00Z`)
    return formmatedDate;
}

/**
 * Session/Reservation에서 반환하는 HH:mm 또는 HH:mm:ss를 KST 기준 Date로 파싱
 * @param dateStr yyyy-mm-dd
 * @param timeStr HH:mm 또는 HH:mm:ss (KST)
 */
export function parseKstDateTime(dateStr: string, timeStr: string): Date {
    const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
    return new Date(`${dateStr}T${normalized}+09:00`);
}