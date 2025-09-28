import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { RedisLiveActivityStateAdapter } from './live-activity-redis-state.adapter';
import type { LiveActivityInfo } from '../../../application/live-activity.model';

const TTL_MS = 24 * 60 * 60 * 1000;

describe('RedisLiveActivityStateAdapter (라이브 액티비티 Redis 상태)', () => {
  let cache: {
    get: jest.MockedFunction<(key: string) => Promise<unknown>>;
    set: jest.MockedFunction<
      (key: string, value: unknown, ttl?: number) => Promise<unknown>
    >;
    del: jest.MockedFunction<(key: string) => Promise<unknown>>;
  };
  let adapter: RedisLiveActivityStateAdapter;

  const activityKey = (sessionId: string | number, memberId: number) =>
    `live-activity:session:${sessionId}:member:${memberId}`;
  const memberSessionsKey = (memberId: number) =>
    `live-activity:member:${memberId}`;
  const sessionMembersKey = (sessionId: string | number) =>
    `live-activity:session:${sessionId}:members`;

  const baseInfo = (memberId: number, sessionId: string): LiveActivityInfo => ({
    memberId,
    sessionId,
    apnsToken: `tok-${memberId}`,
    topic: 'com.widepants.HongPung',
    registeredAt: 1,
    lastUpdated: 2,
  });

  beforeEach(() => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as typeof cache;
    adapter = new RedisLiveActivityStateAdapter(
      cache as unknown as ConstructorParameters<
        typeof RedisLiveActivityStateAdapter
      >[0],
    );
  });

  it('register는 액티비티 키·멤버 세션 목록·세션 멤버 목록에 set한다', async () => {
    cache.get.mockResolvedValue(undefined);

    const info = baseInfo(11, 'sess-a');
    await adapter.register(info);

    expect(cache.set).toHaveBeenCalledWith(
      activityKey('sess-a', 11),
      info,
      TTL_MS,
    );
    expect(cache.set).toHaveBeenCalledWith(
      memberSessionsKey(11),
      ['sess-a'],
      TTL_MS,
    );
    expect(cache.set).toHaveBeenCalledWith(
      sessionMembersKey('sess-a'),
      [11],
      TTL_MS,
    );
  });

  it('같은 sessionId가 멤버 세션 목록에 있으면 멤버 세션 목록 set은 한 번만 일어난다', async () => {
    const store = new Map<string, unknown>();
    cache.get.mockImplementation(async (key: string) => store.get(key));
    cache.set.mockImplementation(
      async (key: string, value: unknown, _ttl?: number) => {
        store.set(key, value);
      },
    );
    cache.del.mockImplementation(async (key: string) => {
      store.delete(key);
    });

    const info = baseInfo(20, 'sess-b');
    await adapter.register(info);
    await adapter.register({ ...info, lastUpdated: 999 });

    expect(store.get(memberSessionsKey(20))).toEqual(['sess-b']);
    const memberListSetCount = cache.set.mock.calls.filter(
      (c) => c[0] === memberSessionsKey(20),
    ).length;
    expect(memberListSetCount).toBe(1);
  });

  it('remove 시 멤버의 마지막 세션이면 멤버 세션 목록 key를 del한다', async () => {
    cache.get.mockResolvedValueOnce(['only-sess']);
    cache.get.mockResolvedValueOnce([3]);

    await adapter.remove(3, 'only-sess');

    expect(cache.del).toHaveBeenCalledWith(memberSessionsKey(3));
    expect(
      cache.set.mock.calls.some((c) => c[0] === memberSessionsKey(3)),
    ).toBe(false);
  });

  it('remove 시 다른 세션이 남아 있으면 멤버 세션 목록을 set으로 갱신한다', async () => {
    cache.get.mockResolvedValueOnce(['a', 'b']);
    cache.get.mockResolvedValueOnce([4]);

    await adapter.remove(4, 'a');

    expect(cache.set).toHaveBeenCalledWith(memberSessionsKey(4), ['b'], TTL_MS);
    expect(cache.del).not.toHaveBeenCalledWith(memberSessionsKey(4));
  });

  it('clearSession은 모든 액티비티를 제거하고 세션 멤버 목록을 지운다', async () => {
    const store = new Map<string, unknown>();

    cache.get.mockImplementation(async (key: string) => store.get(key));
    cache.set.mockImplementation(
      async (key: string, value: unknown, _ttl?: number) => {
        store.set(key, value);
      },
    );
    cache.del.mockImplementation(async (key: string) => {
      store.delete(key);
    });

    await adapter.register(baseInfo(1, 'sx'));
    await adapter.register(baseInfo(2, 'sx'));

    expect(store.get(sessionMembersKey('sx'))).toEqual([1, 2]);

    await adapter.clearSession('sx');

    expect(store.has(activityKey('sx', 1))).toBe(false);
    expect(store.has(activityKey('sx', 2))).toBe(false);
    expect(store.has(sessionMembersKey('sx'))).toBe(false);
    expect(store.get(memberSessionsKey(1))).toBeUndefined();
    expect(store.get(memberSessionsKey(2))).toBeUndefined();
  });
});
