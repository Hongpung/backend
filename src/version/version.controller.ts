import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VersionService } from './version.service';

@ApiTags('버전 API')
@Controller('app/version')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get()
  @ApiOperation({
    summary: '애플리케이션 버전 조회',
    description: 'iOS/Android 각 플랫폼별 최신 버전 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '버전 정보 조회 성공 (Expo EAS Update에서 최신 업데이트 조회)',
    schema: {
      type: 'object',
      properties: {
        ios: {
          type: 'object',
          nullable: true,
          properties: {
            version: { type: 'string', example: '1.0.0' },
            id: { type: 'string' },
            message: { type: 'string' },
            createdAt: { type: 'string' },
            platform: { type: 'string' },
          },
        },
        android: {
          type: 'object',
          nullable: true,
          properties: {
            version: { type: 'string', example: '1.0.0' },
            id: { type: 'string' },
            message: { type: 'string' },
            createdAt: { type: 'string' },
            platform: { type: 'string' },
          },
        },
      },
    },
  })
  getVersion() {
    return this.versionService.getVersion();
  }
}
