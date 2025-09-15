import { Controller, Get, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BannerMemberService } from '../services/banner-member.service';
import { BannerResDto } from '../dto/response';
import { BannerResponseMapper } from './mappers/banner.response.mapper';

@ApiTags('배너 API')
@ApiBearerAuth()
@Controller('banner')
export class BannerMemberController {
  constructor(private readonly bannerMemberService: BannerMemberService) {}

  @Get('on-post')
  @ApiOperation({
    summary: '게시 중인 배너 조회',
    description: '현재 게시 중인 배너들을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '게시 중인 배너 조회 성공',
    type: [BannerResDto],
  })
  async findOnPost(): Promise<BannerResDto[]> {
    try {
      const banners = await this.bannerMemberService.findOnPost();
      return BannerResponseMapper.toDtoArray(banners);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
