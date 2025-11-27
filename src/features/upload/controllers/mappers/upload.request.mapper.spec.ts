import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { UploadRequestMapper } from './upload.request.mapper';
import type { UploadedMulterFile } from '../uploaded-multer-file.type';

describe('UploadRequestMapper', () => {
  const validFile: UploadedMulterFile = {
    mimetype: 'image/jpeg',
    originalname: 'photo.jpg',
  };

  describe('fromMulterFile', () => {
    it('허용 MIME·파일명을 UploadFile로 변환한다', () => {
      expect(UploadRequestMapper.fromMulterFile(validFile)).toEqual({
        mimetype: 'image/jpeg',
        originalname: 'photo.jpg',
      });
    });

    it('파일이 없으면 BadRequestException을 던진다', () => {
      expect(() =>
        UploadRequestMapper.fromMulterFile(null as unknown as UploadedMulterFile),
      ).toThrow(BadRequestException);
      expect(() =>
        UploadRequestMapper.fromMulterFile(null as unknown as UploadedMulterFile),
      ).toThrow(/File is required/);
    });

    it('지원하지 않는 MIME이면 BadRequestException을 던진다', () => {
      expect(() =>
        UploadRequestMapper.fromMulterFile({
          mimetype: 'application/pdf',
          originalname: 'doc.pdf',
        }),
      ).toThrow(BadRequestException);
      expect(() =>
        UploadRequestMapper.fromMulterFile({
          mimetype: 'application/pdf',
          originalname: 'doc.pdf',
        }),
      ).toThrow(/Unsupported MIME type/);
    });

    it('빈 메타데이터면 BadRequestException을 던진다', () => {
      expect(() =>
        UploadRequestMapper.fromMulterFile({
          mimetype: '',
          originalname: 'a.jpg',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('fromMulterFiles', () => {
    it('여러 파일을 UploadFile 배열로 변환한다', () => {
      const files: UploadedMulterFile[] = [
        { mimetype: 'image/png', originalname: 'a.png' },
        { mimetype: 'image/webp', originalname: 'b.webp' },
      ];

      expect(UploadRequestMapper.fromMulterFiles(files)).toEqual([
        { mimetype: 'image/png', originalname: 'a.png' },
        { mimetype: 'image/webp', originalname: 'b.webp' },
      ]);
    });

    it('빈 배열이면 BadRequestException을 던진다', () => {
      expect(() => UploadRequestMapper.fromMulterFiles([])).toThrow(
        BadRequestException,
      );
      expect(() => UploadRequestMapper.fromMulterFiles([])).toThrow(
        /File is required/,
      );
    });

    it('files가 없으면 BadRequestException을 던진다', () => {
      expect(() =>
        UploadRequestMapper.fromMulterFiles(
          null as unknown as UploadedMulterFile[],
        ),
      ).toThrow(BadRequestException);
    });
  });
});
