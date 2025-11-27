import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { UserNotificationTokenEntity } from '../../../domain/user-notification-token.entity';
import { PrismaNotificationTokenRepository } from './notification-token.prisma.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('PrismaNotificationTokenRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaNotificationTokenRepository;

  const runId = Date.now();
  const email = `notification-token-repo-int-${runId}@integration.test`;
  let memberId: number;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new PrismaNotificationTokenRepository(
      prisma as unknown as PrismaService,
    );

    const member = await prisma.member.create({
      data: {
        email,
        password: 'pw',
        name: '토큰통합멤버',
        enrollmentNumber: `notification-token-int-${runId}`,
        clubId: null,
      },
    });
    memberId = member.memberId;
  });

  afterEach(async () => {
    if (!prisma || !memberId) return;

    await prisma.member.update({
      where: { memberId },
      data: { notificationToken: null, pushEnable: false },
    });
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.member.deleteMany({ where: { memberId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('saveToken', () => {
    it('notificationToken과 pushEnable을 저장한다', async () => {
      await repository.saveToken(memberId, {
        notificationToken: 'fcm-token-1',
        pushEnable: true,
      });

      const row = await prisma.member.findUnique({ where: { memberId } });
      expect(row?.notificationToken).toBe('fcm-token-1');
      expect(row?.pushEnable).toBe(true);
    });
  });

  describe('findOneNotificationToken', () => {
    it('저장된 토큰 엔티티를 반환한다', async () => {
      await repository.saveToken(memberId, {
        notificationToken: 'fcm-find-one',
        pushEnable: true,
      });

      const entity = await repository.findOneNotificationToken(memberId);

      expect(entity).toBeInstanceOf(UserNotificationTokenEntity);
      expect(entity!.memberId).toBe(memberId);
      expect(entity!.notificationToken).toBe('fcm-find-one');
      expect(entity!.pushEnable).toBe(true);
    });

    it('존재하지 않는 memberId면 null을 반환한다', async () => {
      expect(
        await repository.findOneNotificationToken(memberId + 99_999),
      ).toBeNull();
    });
  });

  describe('findPushTargetsByMemberIds', () => {
    it('요청한 memberId 목록에 해당하는 토큰 엔티티를 반환한다', async () => {
      const other = await prisma.member.create({
        data: {
          email: `notification-token-other-${runId}@integration.test`,
          password: 'pw',
          name: '다른멤버',
          enrollmentNumber: `notification-token-int-other-${runId}`,
          clubId: null,
          notificationToken: 'fcm-other',
          pushEnable: true,
        },
      });

      await repository.saveToken(memberId, {
        notificationToken: 'fcm-primary',
        pushEnable: true,
      });

      const targets = await repository.findPushTargetsByMemberIds([
        memberId,
        other.memberId,
        memberId + 99_999,
      ]);

      expect(targets).toHaveLength(2);
      expect(
        targets.map((t) => t.notificationToken).sort(),
      ).toEqual(['fcm-other', 'fcm-primary'].sort());

      await prisma.member.delete({ where: { memberId: other.memberId } });
    });

    it('빈 배열이면 빈 배열을 반환한다', async () => {
      expect(await repository.findPushTargetsByMemberIds([])).toEqual([]);
    });
  });

  describe('removeToken', () => {
    it('토큰을 제거하고 pushEnable을 false로 만든다', async () => {
      await repository.saveToken(memberId, {
        notificationToken: 'fcm-remove',
        pushEnable: true,
      });

      await repository.removeToken(memberId);

      const row = await prisma.member.findUnique({ where: { memberId } });
      expect(row?.notificationToken).toBeNull();
      expect(row?.pushEnable).toBe(false);
    });
  });

  describe('updatePushEnable', () => {
    it('엔티티 상태를 DB에 반영한다', async () => {
      await repository.saveToken(memberId, {
        notificationToken: 'fcm-update-enable',
        pushEnable: true,
      });

      const entity = await repository.findOneNotificationToken(memberId);
      entity!.disablePush();
      await repository.updatePushEnable(entity!);

      const row = await prisma.member.findUnique({ where: { memberId } });
      expect(row?.notificationToken).toBe('fcm-update-enable');
      expect(row?.pushEnable).toBe(false);
    });
  });

  describe('findAllNotificationTokens', () => {
    const validEnableToken = `ExponentPushToken[all-valid-enable-${runId}]`;
    const validDisableToken = `ExponentPushToken[all-valid-disable-${runId}]`;
    let seededMemberIds: number[];

    beforeAll(async () => {
      const validEnable = await prisma.member.create({
        data: {
          email: `notification-token-all-enable-${runId}@integration.test`,
          password: 'pw',
          name: '전체조회-활성',
          enrollmentNumber: `notification-token-all-enable-${runId}`,
          clubId: null,
          notificationToken: validEnableToken,
          pushEnable: true,
        },
      });
      const nullDisabled = await prisma.member.create({
        data: {
          email: `notification-token-all-null-${runId}@integration.test`,
          password: 'pw',
          name: '전체조회-없음',
          enrollmentNumber: `notification-token-all-null-${runId}`,
          clubId: null,
          notificationToken: null,
          pushEnable: false,
        },
      });
      const validDisable = await prisma.member.create({
        data: {
          email: `notification-token-all-disable-${runId}@integration.test`,
          password: 'pw',
          name: '전체조회-비활성',
          enrollmentNumber: `notification-token-all-disable-${runId}`,
          clubId: null,
          notificationToken: validDisableToken,
          pushEnable: false,
        },
      });

      seededMemberIds = [
        validEnable.memberId,
        nullDisabled.memberId,
        validDisable.memberId,
      ];
    });

    afterAll(async () => {
      if (!prisma || seededMemberIds.length === 0) return;
      await prisma.member.deleteMany({
        where: { memberId: { in: seededMemberIds } },
      });
    });

    it('시드된 회원의 토큰 엔티티를 올바르게 매핑한다', async () => {
      const all = await repository.findAllNotificationTokens();
      const seeded = all.filter((entity) =>
        seededMemberIds.includes(entity.memberId),
      );

      expect(seeded).toHaveLength(3);
      expect(seeded.every((e) => e instanceof UserNotificationTokenEntity)).toBe(
        true,
      );

      const byMemberId = new Map(seeded.map((e) => [e.memberId, e]));

      const validEnableEntity = byMemberId.get(seededMemberIds[0])!;
      expect(validEnableEntity.notificationToken).toBe(validEnableToken);
      expect(validEnableEntity.pushEnable).toBe(true);

      const nullDisabledEntity = byMemberId.get(seededMemberIds[1])!;
      expect(nullDisabledEntity.notificationToken).toBeNull();
      expect(nullDisabledEntity.pushEnable).toBe(false);

      const validDisableEntity = byMemberId.get(seededMemberIds[2])!;
      expect(validDisableEntity.notificationToken).toBe(validDisableToken);
      expect(validDisableEntity.pushEnable).toBe(false);
    });
  });
});
