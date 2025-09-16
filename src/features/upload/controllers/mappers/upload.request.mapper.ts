import { BadRequestException } from '@nestjs/common';
import type { UploadedMulterFile } from '../uploaded-multer-file.type';
import {
  InvalidUploadFileError,
  createUploadFile,
  type UploadFile,
} from '../../models/upload-file.model';

export class UploadRequestMapper {
  static fromMulterFile(file: UploadedMulterFile): UploadFile {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    try {
      return createUploadFile({
        mimetype: file.mimetype,
        originalname: file.originalname,
      });
    } catch (err) {
      if (err instanceof InvalidUploadFileError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  static fromMulterFiles(files: UploadedMulterFile[]): UploadFile[] {
    if (!files || files.length === 0) {
      throw new BadRequestException('File is required');
    }
    return files.map((f) => UploadRequestMapper.fromMulterFile(f));
  }
}
