import { describe, expect, it } from '@jest/globals';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { END_SESSION_MIN_ELAPSED_MS } from '../session.constant';
import { RealtimeSession } from '../entities/realtime-session.entity';
import { SessionOperationsReadVo } from './session-operations-read.vo';

describe('SessionOperationsReadVo', () => {
  const realtimeSession = (overrides: {
    startTime: string;
    endTime: string;
    date: string;
  }): RealtimeSession =>
    RealtimeSession.rehydrate({
      sessionId: 'rt-1',
      title: '실시간',
      extendCount: 0,
      creatorName: '생성자',
      participationAvailable: true,
      status: 'ONAIR',
      attendanceList: [],
      ...overrides,
    });

  it('종료까지 남은 시간이 최소 연장 기준 이상이면 연장 가능이다', () => {
    const vo = SessionOperationsReadVo.from(
      realtimeSession({
        date: '2026-06-01',
        startTime: '09:00',
        endTime: '11:00',
      }),
    );

    const endMs = AppKstDateTime.parseKstDateTime('2026-06-01', '11:00').getTime();
    const now = new Date(endMs - 25 * 60 * 1000);
    expect(vo.canExtend(now)).toBe(true);
  });

  it('종료까지 남은 시간이 최소 연장 기준 미만이면 연장 불가이다', () => {
    const vo = SessionOperationsReadVo.from(
      realtimeSession({
        date: '2026-06-01',
        startTime: '09:00',
        endTime: '11:00',
      }),
    );

    const endMs = AppKstDateTime.parseKstDateTime('2026-06-01', '11:00').getTime();
    const now = new Date(endMs - 14 * 60 * 1000);
    expect(vo.canExtend(now)).toBe(false);
  });

  it('경과 시간이 최소 종료 기준 이상이면 수동 종료 가능이다', () => {
    const vo = SessionOperationsReadVo.from(
      realtimeSession({
        date: '2026-06-01',
        startTime: '10:00',
        endTime: '11:00',
      }),
    );

    const startInstant = new Date('2026-06-01T01:00:00.000Z').getTime();
    const nowUtc = new Date(startInstant + END_SESSION_MIN_ELAPSED_MS);

    expect(vo.hasElapsedEnoughToEnd(nowUtc)).toBe(true);
  });

  it('경과 시간이 최소 종료 기준 미만이면 수동 종료 불가이다', () => {
    const vo = SessionOperationsReadVo.from(
      realtimeSession({
        date: '2026-06-01',
        startTime: '10:00',
        endTime: '11:00',
      }),
    );

    const startInstant = new Date('2026-06-01T01:00:00.000Z').getTime();
    const nowUtc = new Date(startInstant + END_SESSION_MIN_ELAPSED_MS - 1);

    expect(vo.hasElapsedEnoughToEnd(nowUtc)).toBe(false);
  });
});
