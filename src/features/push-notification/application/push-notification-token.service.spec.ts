import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PushNotificationTokenService } from './push-notification-token.service';
import type { INotificationTokenRepository } from './ports/out/notification-token.repository.port';
import type { IPushNotificationMemberLookup } from './ports/out/push-notification-member-lookup.port';

jest.mock('expo-server-sdk', () => ({
  Expo: {
    isExpoPushToken: jest.fn(),
  },
}));

import { Expo } from 'expo-server-sdk';

const isExpoPushTokenMock = Expo.isExpoPushToken as jest.MockedFunction<
  typeof Expo.isExpoPushToken
>;

describe('PushNotificationTokenService', () => {
  let service: PushNotificationTokenService;
  let tokenRepository: jest.Mocked<
    Pick<INotificationTokenRepository, 'saveToken' | 'removeToken'>
  >;
  let memberLookup: jest.Mocked<
    Pick<IPushNotificationMemberLookup, 'existsMember'>
  >;

  beforeEach(() => {
    isExpoPushTokenMock.mockReset();

    tokenRepository = {
      saveToken: jest.fn(),
      removeToken: jest.fn(),
    };

    memberLookup = {
      existsMember: jest.fn(),
    };

    service = new PushNotificationTokenService(
      tokenRepository as unknown as INotificationTokenRepository,
      memberLookup as unknown as IPushNotificationMemberLookup,
    );
  });

  describe('updatePushNotificationToken', () => {
    it('회원이 없으면 NotFoundException', async () => {
      memberLookup.existsMember.mockResolvedValue(false);

      await expect(
        service.updatePushNotificationToken(1, {
          notificationToken: 'ExponentPushToken[x]',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('토큰이 비어 있으면 BadRequestException', async () => {
      memberLookup.existsMember.mockResolvedValue(true);
      isExpoPushTokenMock.mockReturnValue(true);

      await expect(
        service.updatePushNotificationToken(1, { notificationToken: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('유효하지 않은 Expo 토큰이면 BadRequestException', async () => {
      memberLookup.existsMember.mockResolvedValue(true);
      isExpoPushTokenMock.mockReturnValue(false);

      await expect(
        service.updatePushNotificationToken(1, {
          notificationToken: 'bad',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tokenRepository.saveToken).not.toHaveBeenCalled();
    });

    it('유효한 토큰이면 trim 후 저장한다', async () => {
      memberLookup.existsMember.mockResolvedValue(true);
      isExpoPushTokenMock.mockReturnValue(true);

      await expect(
        service.updatePushNotificationToken(1, {
          notificationToken: '  ExponentPushToken[ok] ',
        }),
      ).resolves.toEqual({ message: '알림 토큰이 등록되었습니다.' });

      expect(tokenRepository.saveToken).toHaveBeenCalledWith(1, {
        notificationToken: 'ExponentPushToken[ok]',
        pushEnable: true,
      });
    });
  });

  describe('clearPushNotificationToken', () => {
    it('회원이 없으면 NotFoundException', async () => {
      memberLookup.existsMember.mockResolvedValue(false);

      await expect(
        service.clearPushNotificationToken(1),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('회원이 있으면 토큰을 제거한다', async () => {
      memberLookup.existsMember.mockResolvedValue(true);

      await expect(service.clearPushNotificationToken(1)).resolves.toEqual({
        message: '알림 토큰이 삭제되었습니다.',
      });
      expect(tokenRepository.removeToken).toHaveBeenCalledWith(1);
    });
  });

  describe('clearPushToken', () => {
    it('로그아웃 등에서 토큰만 제거한다', async () => {
      memberLookup.existsMember.mockResolvedValue(true);

      await expect(service.clearPushToken(1)).resolves.toBeUndefined();
      expect(tokenRepository.removeToken).toHaveBeenCalledWith(1);
    });
  });
});
