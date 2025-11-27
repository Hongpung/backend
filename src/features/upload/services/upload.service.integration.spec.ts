import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UploadService } from './upload.service';
import { createUploadFile } from '../models/upload-file.model';
import type { IUploadRepository } from '../repositories/upload.repository.port';

describe('UploadService (통합)', () => {
  let service: UploadService;
  let fakeUploadRepo: jest.Mocked<IUploadRepository>;

  const singleSignedUrlResult = {
    uploadUrl: 'https://fake-upload.example/upload-key',
    imageUrl: 'https://fake-cdn.example/image-key',
  };

  const multiSignedUrlsResult = {
    uploadUrls: [
      {
        uploadUrl: 'https://fake-upload.example/u1',
        imageUrl: 'https://fake-cdn.example/i1',
      },
      {
        uploadUrl: 'https://fake-upload.example/u2',
        imageUrl: 'https://fake-cdn.example/i2',
      },
    ],
  };

  beforeEach(() => {
    fakeUploadRepo = {
      getSignedUrl: jest
        .fn<IUploadRepository['getSignedUrl']>()
        .mockResolvedValue(singleSignedUrlResult),
      getSignedUrls: jest
        .fn<IUploadRepository['getSignedUrls']>()
        .mockResolvedValue(multiSignedUrlsResult),
    };

    service = new UploadService(fakeUploadRepo);
  });

  describe('getSignedUrl', () => {
    it('유효한 path이면 port에 file·path를 전달하고 반환값을 그대로 반환한다', async () => {
      const file = createUploadFile({
        mimetype: 'image/png',
        originalname: 'profile.png',
      });
      const path = 'images/session_1';

      const result = await service.getSignedUrl(file, path);

      expect(result).toBe(singleSignedUrlResult);
      expect(fakeUploadRepo.getSignedUrl).toHaveBeenCalledTimes(1);
      expect(fakeUploadRepo.getSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          mimetype: 'image/png',
          originalname: 'profile.png',
        }),
        path,
      );
    });

    it('선행 슬래시가 있는 path이면 BadRequestException을 던지고 port를 호출하지 않는다', async () => {
      const file = createUploadFile({
        mimetype: 'image/png',
        originalname: 'profile.png',
      });

      await expect(
        service.getSignedUrl(file, '/images/test'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(fakeUploadRepo.getSignedUrl).not.toHaveBeenCalled();
    });

    it('빈 path이면 BadRequestException을 던지고 port를 호출하지 않는다', async () => {
      const file = createUploadFile({
        mimetype: 'image/png',
        originalname: 'profile.png',
      });

      await expect(service.getSignedUrl(file, '')).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(fakeUploadRepo.getSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('getSignedUrls', () => {
    it('유효한 files와 path이면 port에 배열·path를 전달하고 반환값을 그대로 반환한다', async () => {
      const files = [
        createUploadFile({ mimetype: 'image/png', originalname: 'a.png' }),
        createUploadFile({ mimetype: 'image/jpeg', originalname: 'b.jpg' }),
        createUploadFile({ mimetype: 'image/webp', originalname: 'c.webp' }),
      ];
      const path = 'images/batch_upload';

      const result = await service.getSignedUrls(files, path);

      expect(result).toBe(multiSignedUrlsResult);
      expect(fakeUploadRepo.getSignedUrls).toHaveBeenCalledTimes(1);
      expect(fakeUploadRepo.getSignedUrls).toHaveBeenCalledWith(files, path);
    });

    it('빈 files 배열이면 BadRequestException을 던지고 port를 호출하지 않는다', async () => {
      await expect(
        service.getSignedUrls([], 'images/test'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(fakeUploadRepo.getSignedUrls).not.toHaveBeenCalled();
    });

    it('files는 있으나 path가 유효하지 않으면 BadRequestException을 던지고 port를 호출하지 않는다', async () => {
      const files = [
        createUploadFile({ mimetype: 'image/png', originalname: 'a.png' }),
      ];

      await expect(
        service.getSignedUrls(files, '/images/test'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(fakeUploadRepo.getSignedUrls).not.toHaveBeenCalled();
    });
  });
});
