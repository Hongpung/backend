import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createUploadFile } from '../models/upload-file.model';

const mockGetSignedUrlPromise = jest.fn<(...args: unknown[]) => Promise<string>>();

jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => ({
    getSignedUrlPromise: mockGetSignedUrlPromise,
  })),
}));

import { UploadRepository } from './upload.repository';

describe('UploadRepository', () => {
  const FIXED_NOW = 1_700_000_000_000;
  const BUCKET = 'test-bucket';
  const STORAGE_URL = 'https://cdn.example.com';

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
    mockGetSignedUrlPromise.mockReset();
    mockGetSignedUrlPromise.mockResolvedValue('https://signed.example/put');

    process.env.AWS_S3_BUCKET = BUCKET;
    process.env.STORAGE_URL = STORAGE_URL;
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    process.env.AWS_REGION = 'ap-northeast-2';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getSignedUrl', () => {
    it('passes key, expiry, and contentType to S3 getSignedUrlPromise', async () => {
      const repository = new UploadRepository();
      const file = createUploadFile({
        mimetype: 'image/png',
        originalname: 'photo',
      });
      const path = 'images/session_1';
      const expectedKey = `${path}/photo-${FIXED_NOW}.png`;

      const result = await repository.getSignedUrl(file, path);

      expect(mockGetSignedUrlPromise).toHaveBeenCalledTimes(1);
      expect(mockGetSignedUrlPromise).toHaveBeenCalledWith('putObject', {
        Bucket: BUCKET,
        Key: expectedKey,
        Expires: 60,
        ContentType: 'image/png',
      });
      expect(result).toEqual({
        uploadUrl: 'https://signed.example/put',
        imageUrl: `${STORAGE_URL}/${expectedKey}`,
      });
    });
  });

  describe('getSignedUrls', () => {
    it('passes key, expiry, and contentType for each file', async () => {
      const repository = new UploadRepository();
      const files = [
        createUploadFile({ mimetype: 'image/jpeg', originalname: 'a' }),
        createUploadFile({ mimetype: 'image/webp', originalname: 'b' }),
      ];
      const path = 'images/batch';
      const expectedKeys = [
        `${path}/a-${FIXED_NOW}.jpeg`,
        `${path}/b-${FIXED_NOW}.webp`,
      ];

      mockGetSignedUrlPromise
        .mockResolvedValueOnce('https://signed.example/1')
        .mockResolvedValueOnce('https://signed.example/2');

      const result = await repository.getSignedUrls(files, path);

      expect(mockGetSignedUrlPromise).toHaveBeenCalledTimes(2);
      expect(mockGetSignedUrlPromise).toHaveBeenNthCalledWith(1, 'putObject', {
        Bucket: BUCKET,
        Key: expectedKeys[0],
        Expires: 60,
        ContentType: 'image/jpeg',
      });
      expect(mockGetSignedUrlPromise).toHaveBeenNthCalledWith(2, 'putObject', {
        Bucket: BUCKET,
        Key: expectedKeys[1],
        Expires: 60,
        ContentType: 'image/webp',
      });
      expect(result).toEqual({
        uploadUrls: [
          {
            uploadUrl: 'https://signed.example/1',
            imageUrl: `${STORAGE_URL}/${expectedKeys[0]}`,
          },
          {
            uploadUrl: 'https://signed.example/2',
            imageUrl: `${STORAGE_URL}/${expectedKeys[1]}`,
          },
        ],
      });
    });
  });
});
