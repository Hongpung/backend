import type { UploadFile } from '../models/upload-file.model';

export type SignedUrlPair = { uploadUrl: string; imageUrl: string };

export const UploadRepositoryPort = Symbol('UploadRepositoryPort');

export interface IUploadRepository {
  getSignedUrl(file: UploadFile, path: string): Promise<SignedUrlPair>;
  getSignedUrls(
    files: UploadFile[],
    path: string,
  ): Promise<{ uploadUrls: SignedUrlPair[] }>;
}
