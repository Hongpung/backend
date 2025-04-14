import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, UseGuards } from '@nestjs/common';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('배너 API')
@ApiBearerAuth()
@Controller('banners')
export class BannersController {
  constructor(
    private readonly bannersService: BannersService
  ) { }

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '배너 생성', description: '새로운 배너를 생성합니다.' })
  @ApiResponse({ status: 201, description: '배너 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async create(@Body() createBannerDto: CreateBannerDto) {
    try {
      return await this.bannersService.create(createBannerDto);
    }
    catch (error) {
      {
        throw new BadRequestException(error.message);
      }
    }
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '배너 목록 조회', description: '모든 배너의 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '배너 목록 조회 성공' })
  async findAll() {
    try {
      return await this.bannersService.findAll();
    }
    catch (error) {
      {
        throw new BadRequestException(error.message);
      }
    }
  }

  @Get('on-post')
  @ApiOperation({ summary: '게시 중인 배너 조회', description: '현재 게시 중인 배너들을 조회합니다.' })
  @ApiResponse({ status: 200, description: '게시 중인 배너 조회 성공' })
  async findOnPost() {
    try {
      return await this.bannersService.findOnPost();
    }
    catch (error) {
      {
        throw new BadRequestException(error.message);
      }
    }
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '배너 수정', description: '특정 배너의 정보를 수정합니다.' })
  @ApiParam({ name: 'id', description: '수정할 배너의 ID' })
  @ApiResponse({ status: 200, description: '배너 수정 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '배너를 찾을 수 없음' })
  async update(@Param('id') id: string, @Body() updateBannerDto: UpdateBannerDto) {
    try {
      console.log(updateBannerDto)
      return await this.bannersService.update(+id, updateBannerDto);
    }
    catch (error) {
      {
        throw new BadRequestException(error.message);
      }
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '배너 삭제', description: '특정 배너를 삭제합니다.' })
  @ApiParam({ name: 'id', description: '삭제할 배너의 ID' })
  @ApiResponse({ status: 200, description: '배너 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '배너를 찾을 수 없음' })
  async remove(@Param('id') id: string) {
    try {
      console.log(id)
      return await this.bannersService.remove(+id);
    } catch (error) {
      {
        throw new BadRequestException(error.message);
      }
    }
  }
}
