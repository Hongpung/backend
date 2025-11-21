import { describe, expect, it } from '@jest/globals';
import {
  END_SESSION_MIN_ELAPSED_MS,
  EXTEND_SESSION_MIN_REMAINING_MS,
} from '../../domain/session.constant';
import { computeSessionUseStateBoundaryDelays } from './session-use-state-boundary.delays';

describe('computeSessionUseStateBoundaryDelays', () => {
  it('시작 직후에는 종료 가능·연장 불가 경계 delay를 계산한다', () => {
    const now = new Date('2026-06-15T01:00:00.000Z');
    const delays = computeSessionUseStateBoundaryDelays(
      {
        date: '2026-06-15',
        startTime: '10:00',
        endTime: '11:00',
      },
      now,
    );

    expect(delays.endAvailableDelayMs).toBe(END_SESSION_MIN_ELAPSED_MS);
    expect(delays.extendUnavailableDelayMs).toBe(
      60 * 60 * 1000 - EXTEND_SESSION_MIN_REMAINING_MS,
    );
  });

  it('이미 종료 가능 시점이 지났으면 endAvailable delay는 null이다', () => {
    const now = new Date('2026-06-15T01:20:00.000Z');
    const delays = computeSessionUseStateBoundaryDelays(
      {
        date: '2026-06-15',
        startTime: '10:00',
        endTime: '11:00',
      },
      now,
    );

    expect(delays.endAvailableDelayMs).toBeNull();
    expect(delays.extendUnavailableDelayMs).toBeGreaterThan(0);
  });
});
