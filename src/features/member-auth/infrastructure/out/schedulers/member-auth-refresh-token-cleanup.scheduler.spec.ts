import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import dayjs from 'dayjs';
import type { IMemberAuthSessionRepository } from '../../../application/ports/out/member-auth-session.repository.port';
import { MemberAuthRefreshTokenCleanupSchedulerService } from './member-auth-refresh-token-cleanup.scheduler';

describe('MemberAuthRefreshTokenCleanupSchedulerService', () => {
  let repository: IMemberAuthSessionRepository;
  let deleteStaleRefreshTokensOlderThan: jest.Mock<
    (_cutoff: Date) => Promise<number>
  >;
  let scheduler: MemberAuthRefreshTokenCleanupSchedulerService;
  const FAKE_NOW = '2023-10-26T10:00:00.000Z';

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(FAKE_NOW)); // Set a fixed time for consistent testing

    deleteStaleRefreshTokensOlderThan = jest.fn(
      async (_cutoff: Date): Promise<number> => 2,
    );
    repository = {
      deleteStaleRefreshTokensOlderThan,
    } as unknown as IMemberAuthSessionRepository;

    scheduler = new MemberAuthRefreshTokenCleanupSchedulerService(repository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deleteStaleRefreshTokensOlderThan을 호출하고, 7일 전의 시간을 cutoff로 전달한다', async () => {
    await scheduler.cleanupStaleRefreshTokens();

    expect(deleteStaleRefreshTokensOlderThan).toHaveBeenCalledTimes(1);
    const actualCutoff = deleteStaleRefreshTokensOlderThan.mock
      .calls[0][0] as Date;

    const expectedCutoff = dayjs(FAKE_NOW).subtract(7, 'day').toDate();

    expect(actualCutoff.getTime()).toEqual(expectedCutoff.getTime());
  });
});
