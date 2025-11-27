import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';
import type { INotificationRepository } from './ports/out/notification.repository.port';
import type { INotificationTokenRepository } from './ports/out/notification-token.repository.port';
import type { IPushDeliveryPort } from './ports/out/push-delivery.port';
import { NotificationEntity } from '../domain/notification.entity';
import { UserNotificationTokenEntity } from '../domain/user-notification-token.entity';

describe('NotificationService (알림 유즈케이스)', () => {
  let repository: jest.Mocked<INotificationRepository>;
  let tokenRepository: jest.Mocked<INotificationTokenRepository>;
  let pushDelivery: jest.Mocked<IPushDeliveryPort>;
  let service: NotificationService;
  let warnSpy: jest.SpiedFunction<Logger['warn']>;

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {
      return undefined;
    });

    repository = {
      createNotification: jest.fn(),
      findNotificationsByMemberId: jest.fn(),
      findUnreadNotification: jest.fn(),
      markAllAsRead: jest.fn(),
      deleteNotification: jest.fn(),
      deleteAllNotifications: jest.fn(),
      deleteReadNotificationsOlderThan: jest.fn(),
    };

    tokenRepository = {
      findAllNotificationTokens: jest.fn(),
      findOneNotificationToken: jest.fn(),
      findPushTargetsByMemberIds: jest.fn(),
      saveToken: jest.fn(),
      removeToken: jest.fn(),
      updatePushEnable: jest.fn(),
    };

    pushDelivery = {
      isValidPushToken: jest.fn(),
      send: jest.fn(),
    };

    service = new NotificationService(
      repository,
      tokenRepository,
      pushDelivery,
    );
  });

  afterEach(() => {
    warnSpy.mockRestore();
    jest.restoreAllMocks();
  });

  /** 실제 Prisma 구현은 title/body를 저장 data에 넣지 않을 수 있어, 서비스 단위 테스트는 포트가 돌려준 Entity만 검증한다 */
  function mockCreatedNotification(memberId: number) {
    return NotificationEntity.create({
      notificationId: 100 + memberId,
      memberId,
      data: {
        title: '저장된 제목',
        body: '저장된 본문',
        data: { id: memberId },
      },
    });
  }

  describe('sendPushNotifications', () => {
    it('토큰 레코드가 없는 memberId는 저장·전송 대상에서 제외한다', async () => {
      tokenRepository.findPushTargetsByMemberIds.mockResolvedValue([
        new UserNotificationTokenEntity(2, 'ExponentPushToken[ok]', true),
      ]);
      repository.createNotification.mockImplementation(async (data) =>
        mockCreatedNotification(data.memberId),
      );
      pushDelivery.isValidPushToken.mockReturnValue(true);

      await service.sendPushNotifications({
        to: [1, 2],
        title: '요청 제목',
        body: '요청 본문',
      });

      expect(tokenRepository.findPushTargetsByMemberIds).toHaveBeenCalledWith([
        1, 2,
      ]);
      expect(repository.createNotification).toHaveBeenCalledTimes(1);
      expect(repository.createNotification).toHaveBeenCalledWith({
        memberId: 2,
        title: '요청 제목',
        body: '요청 본문',
      });
      expect(pushDelivery.send).toHaveBeenCalledWith([
        {
          to: 'ExponentPushToken[ok]',
          title: '저장된 제목',
          body: '저장된 본문',
          data: { id: 2 },
        },
      ]);
    });

    it('pushEnable이 false여도 알림 레코드는 생성하고 전송 목록에서는 제외한다', async () => {
      tokenRepository.findPushTargetsByMemberIds.mockResolvedValue([
        new UserNotificationTokenEntity(9, 'ExponentPushToken[off]', false),
      ]);
      repository.createNotification.mockImplementation(async (data) =>
        mockCreatedNotification(data.memberId),
      );

      await service.sendPushNotifications({
        to: [9],
        title: 't',
        body: 'b',
        data: { x: 1 },
      });

      expect(repository.createNotification).toHaveBeenCalledWith({
        memberId: 9,
        title: 't',
        body: 'b',
        data: { x: 1 },
      });
      expect(pushDelivery.isValidPushToken).not.toHaveBeenCalled();
      expect(pushDelivery.send).toHaveBeenCalledWith([]);
    });

    it('유효하지 않은 토큰이면 경고 로그를 남기고 전송하지 않는다', async () => {
      tokenRepository.findPushTargetsByMemberIds.mockResolvedValue([
        new UserNotificationTokenEntity(3, 'bad-token', true),
      ]);
      repository.createNotification.mockImplementation(async (data) =>
        mockCreatedNotification(data.memberId),
      );
      pushDelivery.isValidPushToken.mockReturnValue(false);

      await service.sendPushNotifications({
        to: [3],
        title: 't',
        body: 'b',
      });

      expect(warnSpy).toHaveBeenCalledWith(
        'Push token bad-token는 유효하지 않은 Expo push token입니다.',
      );
      expect(pushDelivery.send).toHaveBeenCalledWith([]);
    });

    it('pushEnable·유효 토큰이면 create 결과의 title·body·data로 전송한다', async () => {
      tokenRepository.findPushTargetsByMemberIds.mockResolvedValue([
        new UserNotificationTokenEntity(5, 'ExponentPushToken[valid]', true),
      ]);
      repository.createNotification.mockImplementation(async (data) =>
        mockCreatedNotification(data.memberId),
      );
      pushDelivery.isValidPushToken.mockReturnValue(true);

      await service.sendPushNotifications({
        to: [5],
        title: 'ignored-in-message',
        body: 'ignored-in-message',
        data: {},
      });

      expect(pushDelivery.send).toHaveBeenCalledWith([
        {
          to: 'ExponentPushToken[valid]',
          title: '저장된 제목',
          body: '저장된 본문',
          data: { id: 5 },
        },
      ]);
    });
  });

  describe('sendAllPushNotifications', () => {
    it('모든 회원 레코드를 조회하지만 pushEnable·유효 토큰을 통과한 항목만 전송한다', async () => {
      tokenRepository.findAllNotificationTokens.mockResolvedValue([
        new UserNotificationTokenEntity(10, null, false),
        new UserNotificationTokenEntity(11, 'ExponentPushToken[full]', true),
        new UserNotificationTokenEntity(12, 'ExponentPushToken[valid]', true),
      ]);
      repository.createNotification.mockImplementation(async (data) =>
        mockCreatedNotification(data.memberId),
      );
      pushDelivery.isValidPushToken.mockImplementation(
        (t) => t === 'ExponentPushToken[valid]',
      );

      await service.sendAllPushNotifications({
        title: '전체 제목',
        body: '전체 본문',
      });

      expect(repository.createNotification).toHaveBeenCalledTimes(3);
      expect(pushDelivery.send).toHaveBeenCalledWith([
        {
          to: 'ExponentPushToken[valid]',
          title: '저장된 제목',
          body: '저장된 본문',
          data: { id: 12 },
        },
      ]);
    });
  });

  describe('getNotreadStatus', () => {
    it('미읽음 알림이 있으면 status가 true다', async () => {
      repository.findUnreadNotification.mockResolvedValue(
        NotificationEntity.create({
          notificationId: 1,
          memberId: 1,
          data: {},
        }),
      );

      await expect(service.getNotreadStatus(1)).resolves.toEqual({
        status: true,
      });
    });

    it('미읽음 알림이 없으면 status가 false다', async () => {
      repository.findUnreadNotification.mockResolvedValue(null);

      await expect(service.getNotreadStatus(2)).resolves.toEqual({
        status: false,
      });
    });
  });
});
