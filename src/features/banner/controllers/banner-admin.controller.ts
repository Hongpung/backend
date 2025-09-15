import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  HttpException,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AdminAccessGuard } from 'src/security/presentation/guards/admin-access.guard';
import { BannerAdminService } from '../services/banner-admin.service';
import { CreateBannerReqDto, UpdateBannerReqDto } from '../dto/request';
import {
  BannerListResDto,
  CreateBannerResDto,
  UpdateBannerResDto,
  DeleteBannerResDto,
} from '../dto/response';
import { BannerResponseMapper } from './mappers/banner.response.mapper';
import { BannerRequestMapper } from './mappers/banner.request.mapper';

@ApiTags('배너 API')
@ApiBearerAuth()
@Controller('banner')
export class BannerAdminController {
  constructor(private readonly bannerAdminService: BannerAdminService) {}

  @Post()
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '배너 생성',
    description: '새로운 배너를 생성합니다.',
  })
  @ApiBody({ type: CreateBannerReqDto })
  @ApiResponse({
    status: 201,
    description: '배너 생성 성공',
    type: CreateBannerResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async create(@Body() dto: CreateBannerReqDto): Promise<CreateBannerResDto> {
    try {
      const params = BannerRequestMapper.toCreateParams(dto);
      const banner = await this.bannerAdminService.create(params);
      return BannerResponseMapper.toCreateResDto(banner);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  @Get()
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '배너 목록 조회',
    description: '모든 배너의 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '배너 목록 조회 성공',
    type: BannerListResDto,
  })
  async findAll(): Promise<BannerListResDto> {
    try {
      const { afterPost, onPost, beforePost } =
        await this.bannerAdminService.findAll();
      return BannerResponseMapper.toListResDto(afterPost, onPost, beforePost);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  @Patch(':id')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '배너 수정',
    description: '특정 배너의 정보를 수정합니다.',
  })
  @ApiParam({ name: 'id', description: '수정할 배너의 ID' })
  @ApiBody({ type: UpdateBannerReqDto })
  @ApiResponse({
    status: 200,
    description: '배너 수정 성공',
    type: UpdateBannerResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '배너를 찾을 수 없음' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBannerReqDto,
  ): Promise<UpdateBannerResDto> {
    try {
      const params = BannerRequestMapper.toUpdateParams(dto);
      const banner = await this.bannerAdminService.update(id, params);
      return BannerResponseMapper.toUpdateResDto(banner);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  @Delete(':id')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '배너 삭제',
    description: '특정 배너를 삭제합니다.',
  })
  @ApiParam({ name: 'id', description: '삭제할 배너의 ID' })
  @ApiResponse({
    status: 200,
    description: '배너 삭제 성공',
    type: DeleteBannerResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '배너를 찾을 수 없음' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DeleteBannerResDto> {
    try {
      await this.bannerAdminService.remove(id);
      return BannerResponseMapper.toDeleteResDto();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
