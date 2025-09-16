import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  UploadRepositoryPort,
  type IUploadRepository,
} from '../repositories/upload.repository.port';
import type { UploadFile } from '../models/upload-file.model';

@Injectable()
export class UploadService {
  constructor(
    @Inject(UploadRepositoryPort)
    private readonly uploadRepository: IUploadRepository,
  ) {}

  private validatePath(path: string): void {
    if (!path) {
      throw new BadRequestException('Path is required');
    }

    if (path.startsWith('/')) {
      throw new BadRequestException('Leading slash is not allowed in path');
    }

    if (path.includes('..') || path.includes('//')) {
      throw new BadRequestException('Invalid path pattern');
    }

    if (!/^[a-z0-9/_-]+$/.test(path)) {
      throw new BadRequestException('Path contains unsupported characters');
    }
  }

  async getSignedUrl(
    file: UploadFile,
    path: string,
  ): Promise<{ uploadUrl: string; imageUrl: string }> {
    this.validatePath(path);
    return this.uploadRepository.getSignedUrl(file, path);
  }

  async getSignedUrls(
    files: UploadFile[],
    path: string,
  ): Promise<{ uploadUrls: { uploadUrl: string; imageUrl: string }[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('File is required');
    }

    this.validatePath(path);

    return this.uploadRepository.getSignedUrls(files, path);
  }
}
