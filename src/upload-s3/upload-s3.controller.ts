import { Controller, Post, UploadedFile, Body, UseInterceptors, UploadedFiles, UseGuards, Req } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadS3Service } from './upload-s3.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('파일 업로드 API')
@ApiBearerAuth()
@Controller('upload-s3')
export class UploadS3Controller {
  constructor(private readonly s3Service: UploadS3Service) {}

  @Post('image')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: '단일 이미지 업로드', description: '단일 이미지 파일을 S3에 업로드합니다.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: '업로드할 이미지 파일'
        },
        path: {
          type: 'string',
          description: 'S3에 저장할 경로'
        }
      },
      required: ['image', 'path']
    }
  })
  @ApiResponse({ status: 201, description: '이미지 업로드 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 400, description: '파일 또는 경로가 누락됨' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('path') path: string,
  ): Promise<{ uploadUrl: string; imageUrl: string }> {
    if (!file) {
      throw new Error('File is required');
    }

    if (!path) {
      throw new Error('Path is required');
    }

    return this.s3Service.getSignedUrl(file, path);
  }

  @Post('images')
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('images', 12))
  @ApiOperation({ summary: '다중 이미지 업로드', description: '여러 이미지 파일을 S3에 업로드합니다. (최대 12개)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
            description: '업로드할 이미지 파일들'
          },
          maxItems: 12
        },
        path: {
          type: 'string',
          description: 'S3에 저장할 경로'
        }
      },
      required: ['images', 'path']
    }
  })
  @ApiResponse({ status: 201, description: '이미지 업로드 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 400, description: '파일 또는 경로가 누락됨' })
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('path') path: string,
  ): Promise<{ uploadUrls: { uploadUrl: string; imageUrl: string }[] }> {
    if (!files) {
      throw new Error('File is required');
    }

    if (!path) {
      throw new Error('Path is required');
    }

    return this.s3Service.getSignedUrls(files, path);
  }
}
