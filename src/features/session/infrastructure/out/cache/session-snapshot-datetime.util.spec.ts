import { describe, expect, it } from '@jest/globals';
import {
  stripUndefinedForFirestore,
  toOptionalValidSnapshotDate,
  toValidSnapshotDate,
} from './session-snapshot-datetime.util';

describe('session-snapshot-datetime.util', () => {
  it('converts Firestore Timestamp-like objects', () => {
    const date = toValidSnapshotDate({
      _seconds: 1_700_000_000,
      _nanoseconds: 0,
    });

    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).toBe(1_700_000_000_000);
  });

  it('converts values with toDate()', () => {
    const date = toValidSnapshotDate({
      toDate: () => new Date('2026-06-01T10:00:00.000Z'),
    });

    expect(date.toISOString()).toBe('2026-06-01T10:00:00.000Z');
  });

  it('returns undefined for invalid optional values', () => {
    expect(toOptionalValidSnapshotDate(new Date('invalid'))).toBeUndefined();
    expect(toOptionalValidSnapshotDate(undefined)).toBeUndefined();
  });

  it('strips undefined fields for Firestore documents', () => {
    const payload = stripUndefinedForFirestore({
      list: [
        {
          attendanceList: [{ status: '결석', timeStamp: undefined }],
        },
      ],
    });

    expect(
      (payload as { list: { attendanceList: { timeStamp?: Date }[] }[] })
        .list[0]?.attendanceList[0]?.timeStamp,
    ).toBeUndefined();
    expect(
      'timeStamp' in (payload as { list: { attendanceList: object[] }[] }).list[0]
        .attendanceList[0],
    ).toBe(false);
  });

  it('falls back to now for required values', () => {
    const before = Date.now();
    const date = toValidSnapshotDate(new Date('invalid'));
    const after = Date.now();

    expect(date.getTime()).toBeGreaterThanOrEqual(before);
    expect(date.getTime()).toBeLessThanOrEqual(after);
  });
});
