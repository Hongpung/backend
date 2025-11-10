import { describe, expect, it } from '@jest/globals';
import { AdminSessionLogResponseMapper } from './admin-session-log.response.mapper';

describe('AdminSessionLogResponseMapper', () => {
  const rows = [{ sessionId: 1 }, { sessionId: 2 }];

  it('toLatestList는 입력 배열을 그대로 반환한다', () => {
    expect(AdminSessionLogResponseMapper.toLatestList(rows)).toBe(rows);
  });

  it('toMonthCalendar는 입력 배열을 그대로 반환한다', () => {
    expect(AdminSessionLogResponseMapper.toMonthCalendar(rows)).toBe(rows);
  });

  it('toDailyList는 입력 배열을 그대로 반환한다', () => {
    expect(AdminSessionLogResponseMapper.toDailyList(rows)).toBe(rows);
  });
});
