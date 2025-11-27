import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { UploadService } from './upload.service';
import { createUploadFile } from '../models/upload-file.model';
import type { IUploadRepository } from '../repositories/upload.repository.port';

const png = () =>
  createUploadFile({ mimetype: 'image/png', originalname: 'test' });

describe('UploadService', () => {
  let service: UploadService;
  let repository: jest.Mocked<IUploadRepository>;

  beforeEach(() => {
    repository = {
      getSignedUrl: jest
        .fn<IUploadRepository['getSignedUrl']>()
        .mockResolvedValue({ uploadUrl: 'u', imageUrl: 'i' }),
      getSignedUrls: jest
        .fn<IUploadRepository['getSignedUrls']>()
        .mockResolvedValue({
          uploadUrls: [{ uploadUrl: 'u1', imageUrl: 'i1' }],
        }),
    };

    service = new UploadService(repository);
  });

  it('allows a supported mime and safe path for single upload', async () => {
    await expect(
      service.getSignedUrl(png(), 'images/session_1'),
    ).resolves.toEqual({ uploadUrl: 'u', imageUrl: 'i' });
    expect(repository.getSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('rejects unsafe paths', async () => {
    await expect(
      service.getSignedUrl(png(), '/images/test'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getSignedUrl(png(), 'images/../test'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getSignedUrl(png(), 'images//test'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getSignedUrl(png(), 'Images/Test'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects empty file list for multi upload', async () => {
    await expect(
      service.getSignedUrls([], 'images/test'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
