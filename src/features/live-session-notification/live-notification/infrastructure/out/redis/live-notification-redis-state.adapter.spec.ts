import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { RedisLiveNotificationStateAdapter } from './live-notification-redis-state.adapter';
import type { LiveNotificationInfo } from '../../../application/live-notification.model';

const TTL_MS = 24 * 60 * 60 * 1000;

describe('RedisLiveNotificationStateAdapter (라이브 알림 Redis 상태)', () => {
  let cache: {
    get: jest.MockedFunction<(key: string) => Promise<unknown>>;
    set: jest.MockedFunction<
      (key: string, value: unknown, ttl?: number) => Promise<unknown>
    >;
    del: jest.MockedFunction<(key: string) => Promise<unknown>>;
  };
  let adapter: RedisLiveNotificationStateAdapter;

  const memberKey = (sessionId: string | number, memberId: number) =>
    `live-notification:session:${sessionId}:member:${memberId}`;
  const membersKey = (sessionId: string | number) =>
    `live-notification:session:${sessionId}:members`;

  beforeEach(() => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as typeof cache;
    adapter = new RedisLiveNotificationStateAdapter(
      cache as unknown as ConstructorParameters<
        typeof RedisLiveNotificationStateAdapter
      >[0],
    );
  });

  it('register는 멤버 키와 세션 멤버 목록 키에 올바른 TTL로 set한다', async () => {
    cache.get.mockResolvedValue(undefined);

    const info: LiveNotificationInfo = {
      memberId: 10,
      sessionId: 'room-1',
      expoToken: 'tok',
      registeredAt: 100,
    };

    await adapter.register(info);

    expect(cache.set).toHaveBeenCalledWith(
      memberKey('room-1', 10),
      info,
      TTL_MS,
    );
    expect(cache.set).toHaveBeenCalledWith(membersKey('room-1'), [10], TTL_MS);
  });

  it('register 시 이미 세션 멤버 목록에 memberId가 있으면 목록 set을 생략한다', async () => {
    cache.get.mockResolvedValue([42]);

    await adapter.register({
      memberId: 42,
      sessionId: 's',
      expoToken: null,
      registeredAt: 1,
    });

    const memberListSets = cache.set.mock.calls.filter(
      (c) => c[0] === membersKey('s'),
    );
    expect(memberListSets).toHaveLength(0);
    expect(cache.set).toHaveBeenCalledWith(
      memberKey('s', 42),
      expect.any(Object),
      TTL_MS,
    );
  });

  it('remove 후 남은 멤버가 없으면 세션 멤버 목록 key를 del한다', async () => {
    cache.get.mockResolvedValueOnce([77]);

    await adapter.remove(77, 'sess-x');

    expect(cache.del).toHaveBeenCalledWith(membersKey('sess-x'));
    expect(
      cache.set.mock.calls.some((c) => c[0] === membersKey('sess-x')),
    ).toBe(false);
  });

  it('remove 후 멤버가 남아 있으면 세션 멤버 목록을 set으로 갱신한다', async () => {
    cache.get.mockResolvedValueOnce([1, 2]);

    await adapter.remove(1, 'sess-y');

    expect(cache.set).toHaveBeenCalledWith(membersKey('sess-y'), [2], TTL_MS);
    expect(cache.del).not.toHaveBeenCalledWith(membersKey('sess-y'));
  });

  it('clearSession은 조회된 멤버별 알림 키를 지우고 멤버 목록 키를 지운다', async () => {
    cache.get.mockResolvedValueOnce([3, 4]);

    await adapter.clearSession('z');

    expect(cache.del).toHaveBeenCalledWith(memberKey('z', 3));
    expect(cache.del).toHaveBeenCalledWith(memberKey('z', 4));
    expect(cache.del).toHaveBeenCalledWith(membersKey('z'));
  });
});
