import {
  Controller,
  Post,
  UploadedFile,
  Body,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { UploadedMulterFile } from './uploaded-multer-file.type';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import {
  AdminAccessGuard,
  UserAccessGuard,
} from 'src/security/presentation/guards';
import { UseGuardsOr } from 'src/security/presentation/decorators';
import { UploadRequestMapper } from './mappers/upload.request.mapper';
import {
  UploadMultipleImagesResDto,
  UploadSingleImageResDto,
} from '../dto/response/upload-signed-url.res.dto';
import { UploadService } from '../services/upload.service';

@ApiTags('파일 업로드 API')
@ApiBearerAuth()
@Controller('upload-s3')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseGuardsOr(UserAccessGuard, AdminAccessGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: '단일 이미지 업로드',
    description: '단일 이미지 파일을 S3에 업로드합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: '업로드할 이미지 파일',
        },
        path: {
          type: 'string',
          description: 'S3에 저장할 경로',
        },
      },
      required: ['image', 'path'],
    },
  })
  @ApiResponse({
    status: 201,
    description: '이미지 업로드 성공',
    type: UploadSingleImageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 400, description: '파일 또는 경로가 누락됨' })
  async uploadImage(
    @UploadedFile() file: UploadedMulterFile,
    @Body('path') path: string,
  ): Promise<{ uploadUrl: string; imageUrl: string }> {
    return this.uploadService.getSignedUrl(
      UploadRequestMapper.fromMulterFile(file),
      path,
    );
  }

  @Post('images')
  @UseGuardsOr(UserAccessGuard, AdminAccessGuard)
  @UseInterceptors(FilesInterceptor('images', 12))
  @ApiOperation({
    summary: '다중 이미지 업로드',
    description: '여러 이미지 파일을 S3에 업로드합니다. (최대 12개)',
  })
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
            description: '업로드할 이미지 파일들',
          },
          maxItems: 12,
        },
        path: {
          type: 'string',
          description: 'S3에 저장할 경로',
        },
      },
      required: ['images', 'path'],
    },
  })
  @ApiResponse({
    status: 201,
    description: '이미지 업로드 성공',
    type: UploadMultipleImagesResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 400, description: '파일 또는 경로가 누락됨' })
  async uploadImages(
    @UploadedFiles() files: UploadedMulterFile[],
    @Body('path') path: string,
  ): Promise<{ uploadUrls: { uploadUrl: string; imageUrl: string }[] }> {
    return this.uploadService.getSignedUrls(
      UploadRequestMapper.fromMulterFiles(files),
      path,
    );
  }
}
