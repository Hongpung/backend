import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

/** Session wall-clock fields (start/end/planned) are always HH:mm without seconds. */
export function serializeSessionWallTime(time: string): string {
  return AppKstDateTime.normalizeReservationTimeToHHmm(time);
}

/** Attendance timestamps serialized for wire/JSON without seconds (벽시각 앵커). */
export function serializeSessionTimeStamp(date: Date): string {
  return AppKstDateTime.dateTimeFormmatForClient(date);
}
