import { describe, expect, it } from '@jest/globals';
import { InvalidUploadFileError, createUploadFile } from './upload-file.model';

describe('UploadFile', () => {
  it('creates for allowed mime types', () => {
    const file = createUploadFile({
      mimetype: 'image/png',
      originalname: 'a.png',
    });
    expect(file.mimetype).toBe('image/png');
    expect(file.originalname).toBe('a.png');
  });

  it('rejects unsupported mime', () => {
    expect(() =>
      createUploadFile({
        mimetype: 'application/pdf',
        originalname: 'x.pdf',
      }),
    ).toThrow(InvalidUploadFileError);
  });

  it('rejects empty metadata', () => {
    expect(() =>
      createUploadFile({
        mimetype: '',
        originalname: 'a',
      }),
    ).toThrow(InvalidUploadFileError);
    expect(() =>
      createUploadFile({
        mimetype: 'image/png',
        originalname: '',
      }),
    ).toThrow(InvalidUploadFileError);
  });
});
