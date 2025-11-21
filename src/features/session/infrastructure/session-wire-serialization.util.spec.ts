import { describe, expect, it } from '@jest/globals';
import {
  serializeSessionTimeStamp,
  serializeSessionWallTime,
} from './session-wire-serialization.util';

describe('session-wire-serialization.util', () => {
  it('strips seconds from wall times', () => {
    expect(serializeSessionWallTime('10:00:00')).toBe('10:00');
    expect(serializeSessionWallTime('9:5')).toBe('09:05');
  });

  it('formats attendance timestamps without seconds', () => {
    const formatted = serializeSessionTimeStamp(
      new Date('2026-06-01T01:30:45.123Z'),
    );

    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(formatted).not.toContain(':30:45');
  });
});
