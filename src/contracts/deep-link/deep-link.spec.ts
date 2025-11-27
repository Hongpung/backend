import { describe, expect, it } from '@jest/globals';
import {
  APP_DEEP_LINK_ORIGIN,
  buildAppDeepLink,
  buildNoticeDeepLink,
  buildReservationDeepLink,
  buildSessionLogDeepLink,
  DEEP_LINK_PATH,
} from './deep-link';

describe('deep-link', () => {
  it('buildReservationDeepLink은 예약 universal link를 만든다', () => {
    expect(buildReservationDeepLink(42)).toBe(
      `${APP_DEEP_LINK_ORIGIN}/reservation/42`,
    );
  });

  it('buildNoticeDeepLink은 공지 universal link를 만든다', () => {
    expect(buildNoticeDeepLink(7)).toBe(`${APP_DEEP_LINK_ORIGIN}/notice/7`);
  });

  it('buildAppDeepLink은 static path를 origin에 붙인다', () => {
    expect(buildAppDeepLink(DEEP_LINK_PATH.CHECK_IN)).toBe(
      `${APP_DEEP_LINK_ORIGIN}/check-in`,
    );
  });

  it('buildSessionLogDeepLink은 세션 로그 universal link를 만든다', () => {
    expect(buildSessionLogDeepLink(42)).toBe(
      `${APP_DEEP_LINK_ORIGIN}/session-log/42`,
    );
  });
});
