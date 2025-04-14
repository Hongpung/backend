import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class UploadS3Service {
  private readonly s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
  }

  async getSignedUrl(file: Express.Multer.File, path: string): Promise<{ uploadUrl: string; imageUrl: string }> {
    const fileName = `${file.originalname}-${Date.now()}.${file.mimetype.split('/')[1]}`;
    const filePath = `${path}/${fileName}`;

    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: filePath,
      Expires: 60, // Signed URL 만료 시간 (초)
      ContentType: file.mimetype,
    };

    const signedUrl = await this.s3.getSignedUrlPromise('putObject', params);
    const imageUrl = `${process.env.STORAGE_URL}/${filePath}`;

    return { uploadUrl: signedUrl, imageUrl };
  }

  async getSignedUrls(
    files: Express.Multer.File[],
    path: string
  ): Promise<{ uploadUrls: { uploadUrl: string; imageUrl: string }[] }> {
    const uploadUrls = await Promise.all(
      files.map(async (file) => {
        const fileName = `${file.originalname}-${Date.now()}.${file.mimetype.split('/')[1]}`;
        const filePath = `${path}/${fileName}`;

        const params = {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: filePath,
          Expires: 60, // Signed URL 만료 시간 (초)
          ContentType: file.mimetype,
        };

        const signedUrl = await this.s3.getSignedUrlPromise('putObject', params);
        const imageUrl = `${process.env.STORAGE_URL}/${filePath}`;

        return { uploadUrl: signedUrl, imageUrl };
      }),
    );

    return { uploadUrls };
  }
}
