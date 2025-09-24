import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { LiveNotificationService } from './live-notification.service';
import type { ILiveNotificationStatePort } from './ports/out/live-notification-state.port';
import type { ILiveNotificationPushPort } from './ports/out/live-notification-push.port';
import type { LiveNotificationInfo } from './live-notification.model';
import { LiveNotificationMemberLookupAdapter } from '../infrastructure/out/adapters/live-notification-member-lookup.adapter';
import { MemberLookupService } from 'src/features/member/application/use-case/member-lookup.use-case';
import { MemberPrismaRepository } from 'src/features/member/infrastructure/out/prisma/member.prisma.repository';
import type { IMemberRepository } from 'src/features/member/application/ports/out/member.repository.port';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const validExpoToken = 'ExponentPushToken[integration-live-notification]';

class InMemoryLiveNotificationStatePort implements ILiveNotificationStatePort {
  private readonly byKey = new Map<string, LiveNotificationInfo>();

  private key(memberId: number, sessionId: number | string): string {
    return `${memberId}:${sessionId}`;
  }

  async register(info: LiveNotificationInfo): Promise<void> {
    this.byKey.set(this.key(info.memberId, info.sessionId), { ...info });
  }

  async find(
    memberId: number,
    sessionId: number | string,
  ): Promise<LiveNotificationInfo | null> {
    return this.byKey.get(this.key(memberId, sessionId)) ?? null;
  }

  async save(info: LiveNotificationInfo): Promise<void> {
    this.byKey.set(this.key(info.memberId, info.sessionId), { ...info });
  }

  async remove(memberId: number, sessionId: number | string): Promise<void> {
    this.byKey.delete(this.key(memberId, sessionId));
  }

  async getSessionMemberIds(sessionId: number | string): Promise<number[]> {
    const ids = new Set<number>();
    for (const info of this.byKey.values()) {
      if (String(info.sessionId) === String(sessionId)) {
        ids.add(info.memberId);
      }
    }
    return [...ids];
  }

  async findAllBySession(sessionId: number | string): Promise<LiveNotificationInfo[]> {
    return [...this.byKey.values()].filter(
      (info) => String(info.sessionId) === String(sessionId),
    );
  }

  async clearSession(sessionId: number | string): Promise<void> {
    for (const [key, info] of this.byKey.entries()) {
      if (String(info.sessionId) === String(sessionId)) {
        this.byKey.delete(key);
      }
    }
  }
}

describeIntegration('LiveNotificationService (통합)', () => {
  let prisma: PrismaClient;
  let service: LiveNotificationService;
  let state: InMemoryLiveNotificationStatePort;
  let push: jest.Mocked<ILiveNotificationPushPort>;

  const runId = Date.now();
  const memberEmail = `live-noti-svc-int-${runId}@integration.test`;
  let memberId: number;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();

    const memberRepository = new MemberPrismaRepository(
      prisma as unknown as PrismaService,
    );
    const memberLookupService = new MemberLookupService(
      memberRepository as unknown as IMemberRepository,
    );
    const memberLookup = new LiveNotificationMemberLookupAdapter(
      memberLookupService,
    );

    const member = await prisma.member.create({
      data: {
        email: memberEmail,
        password: 'pw',
        name: '라이브알림통합회원',
        enrollmentNumber: `live-noti-svc-${runId}`,
        clubId: null,
        notificationToken: validExpoToken,
      },
    });
    memberId = member.memberId;
  });

  beforeEach(() => {
    state = new InMemoryLiveNotificationStatePort();
    push = {
      sendLiveNotification: jest.fn(async () => undefined),
    };

    const memberRepository = new MemberPrismaRepository(
      prisma as unknown as PrismaService,
    );
    const memberLookupService = new MemberLookupService(
      memberRepository as unknown as IMemberRepository,
    );
    const memberLookup = new LiveNotificationMemberLookupAdapter(
      memberLookupService,
    );

    service = new LiveNotificationService(state, push, memberLookup);
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.member.deleteMany({ where: { memberId } });
    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('registerLiveNotification', () => {
    it('회원 Expo 토큰으로 state에 등록 payload를 저장한다', async () => {
      const registeredAtBefore = Math.floor(Date.now() / 1000);

      await service.registerLiveNotification({ sessionId: 'sess-reg' }, memberId);

      const registeredAtAfter = Math.floor(Date.now() / 1000);
      const stored = await state.find(memberId, 'sess-reg');

      expect(stored).toMatchObject({
        memberId,
        sessionId: 'sess-reg',
        expoToken: validExpoToken,
      });
      expect(stored!.registeredAt).toBeGreaterThanOrEqual(registeredAtBefore);
      expect(stored!.registeredAt).toBeLessThanOrEqual(registeredAtAfter);
    });

    it('회원이 없으면 NotFoundException이다', async () => {
      await expect(
        service.registerLiveNotification({ sessionId: 'sess-missing' }, 9_999_999),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('sendLiveNotification', () => {
    it('SESSION_EXTEND이면 endsAt을 담아 push를 호출한다', async () => {
      await state.register({
        memberId,
        sessionId: 'sess-extend',
        expoToken: validExpoToken,
        registeredAt: 0,
      });

      await service.sendLiveNotification({
        sessionId: 'sess-extend',
        action: 'SESSION_EXTEND',
        endTime: 1_717_200_000,
      });

      expect(push.sendLiveNotification).toHaveBeenCalledWith(
        [validExpoToken],
        {
          type: 'SESSION_EXTEND',
          endsAt: 1_717_200_000 * 1000,
        },
        'high',
      );
    });

    it('SESSION_END이면 type만 담아 push를 호출한다', async () => {
      await state.register({
        memberId,
        sessionId: 'sess-end',
        expoToken: validExpoToken,
        registeredAt: 0,
      });

      await service.sendLiveNotification({
        sessionId: 'sess-end',
        action: 'SESSION_END',
      });

      expect(push.sendLiveNotification).toHaveBeenCalledWith(
        [validExpoToken],
        { type: 'SESSION_END' },
        'high',
      );
    });
  });

  describe('extendSessionLiveNotifications', () => {
    it('registeredAt을 갱신하고 SESSION_EXTEND push를 보낸다', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-01T12:00:00Z'));

      await state.register({
        memberId,
        sessionId: 'sess-extend-flow',
        expoToken: validExpoToken,
        registeredAt: 100,
      });

      jest.setSystemTime(new Date('2025-06-01T12:05:00Z'));

      await service.extendSessionLiveNotifications({
        sessionId: 'sess-extend-flow',
        remainingMsUntilPreviousEnd: 8000,
        endTimeMs: 12_500,
      });

      const stored = await state.find(memberId, 'sess-extend-flow');
      expect(stored?.registeredAt).toBe(Math.floor(Date.now() / 1000));

      expect(push.sendLiveNotification).toHaveBeenCalledWith(
        [validExpoToken],
        expect.objectContaining({ type: 'SESSION_EXTEND' }),
        'high',
      );

      const data = (push.sendLiveNotification.mock.calls[0] ?? [])[1] as {
        endsAt?: number;
      };
      expect(data.endsAt).toBe(Math.floor(12_500 / 1000) * 1000);

      jest.useRealTimers();
    });
  });

  describe('endSessionLiveNotifications', () => {
    it('push 실패해도 clearSession은 실행된다', async () => {
      await state.register({
        memberId,
        sessionId: 200,
        expoToken: validExpoToken,
        registeredAt: 0,
      });

      push.sendLiveNotification.mockRejectedValue(new Error('push failed'));

      await service.endSessionLiveNotifications(200);

      expect(push.sendLiveNotification).toHaveBeenCalled();
      expect(await state.find(memberId, 200)).toBeNull();
      expect(await state.getSessionMemberIds(200)).toEqual([]);
    });
  });

  describe('getAllLiveNotificationsForSession — Redis 읽기 degrade (LSN-INT-A2)', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('findAllBySession 실패 시 빈 배열을 반환한다', async () => {
      await state.register({
        memberId,
        sessionId: 'sess-degrade-read',
        expoToken: validExpoToken,
        registeredAt: 0,
      });

      jest
        .spyOn(state, 'findAllBySession')
        .mockRejectedValue(new Error('redis read fail'));

      const result =
        await service.getAllLiveNotificationsForSession('sess-degrade-read');

      expect(result).toEqual([]);
    });

    it('findAllBySession 실패 시 sendLiveNotification은 push를 호출하지 않는다', async () => {
      await state.register({
        memberId,
        sessionId: 'sess-degrade-send',
        expoToken: validExpoToken,
        registeredAt: 0,
      });

      jest
        .spyOn(state, 'findAllBySession')
        .mockRejectedValue(new Error('redis read fail'));

      await service.sendLiveNotification({
        sessionId: 'sess-degrade-send',
        action: 'SESSION_EXTEND',
        endTime: 1_717_200_000,
      });

      expect(push.sendLiveNotification).not.toHaveBeenCalled();
    });
  });

  describe('extendSessionLiveNotifications — partial member failure (LSN-INT-A3)', () => {
    const syntheticMemberIds = [9001, 9002, 9003] as const;
    const partialSessionId = 'sess-partial-extend';
    const tokenFor = (id: number) => `ExponentPushToken[member-${id}]`;

    beforeEach(async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-01T12:00:00Z'));

      for (const id of syntheticMemberIds) {
        await state.register({
          memberId: id,
          sessionId: partialSessionId,
          expoToken: tokenFor(id),
          registeredAt: 100,
        });
      }
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('모든 find가 실패하면 push 미호출이고 registeredAt은 유지된다', async () => {
      const readState = state.find.bind(state);
      jest.spyOn(state, 'find').mockRejectedValue(new Error('redis find fail'));

      await service.extendSessionLiveNotifications({
        sessionId: partialSessionId,
        remainingMsUntilPreviousEnd: 8000,
        endTimeMs: 12_500,
      });

      expect(push.sendLiveNotification).not.toHaveBeenCalled();

      for (const id of syntheticMemberIds) {
        const stored = await readState(id, partialSessionId);
        expect(stored?.registeredAt).toBe(100);
      }
    });

    it('일부 find만 실패하면 성공 멤버만 registeredAt 갱신 후 push 1회 호출', async () => {
      const readState = state.find.bind(state);
      jest.spyOn(state, 'find').mockImplementation(async (mid, sid) => {
        if (mid === 9002) {
          throw new Error('redis find fail');
        }
        return readState(mid, sid);
      });

      jest.setSystemTime(new Date('2025-06-01T12:05:00Z'));

      await service.extendSessionLiveNotifications({
        sessionId: partialSessionId,
        remainingMsUntilPreviousEnd: 8000,
        endTimeMs: 12_500,
      });

      expect(push.sendLiveNotification).toHaveBeenCalledTimes(1);

      const expectedRegisteredAt = Math.floor(Date.now() / 1000);
      expect((await readState(9001, partialSessionId))?.registeredAt).toBe(
        expectedRegisteredAt,
      );
      expect((await readState(9002, partialSessionId))?.registeredAt).toBe(100);
      expect((await readState(9003, partialSessionId))?.registeredAt).toBe(
        expectedRegisteredAt,
      );
    });

    it('일부 save가 실패해도 성공 멤버는 registeredAt 갱신 후 push 1회 호출', async () => {
      const readState = state.find.bind(state);
      const originalSave = state.save.bind(state);
      jest.spyOn(state, 'save').mockImplementation(async (info) => {
        if (info.memberId === 9002) {
          throw new Error('redis save fail');
        }
        return originalSave(info);
      });

      jest.setSystemTime(new Date('2025-06-01T12:05:00Z'));

      await service.extendSessionLiveNotifications({
        sessionId: partialSessionId,
        remainingMsUntilPreviousEnd: 8000,
        endTimeMs: 12_500,
      });

      expect(push.sendLiveNotification).toHaveBeenCalledTimes(1);

      const expectedRegisteredAt = Math.floor(Date.now() / 1000);
      expect((await readState(9001, partialSessionId))?.registeredAt).toBe(
        expectedRegisteredAt,
      );
      expect((await readState(9003, partialSessionId))?.registeredAt).toBe(
        expectedRegisteredAt,
      );
    });
  });
});
