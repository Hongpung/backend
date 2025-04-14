import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { NoticeService } from './notice.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { UseGuardsOr } from 'src/decorators/use-guards-or.decorator';
import { AdminGuard } from 'src/guards/admin.guard';
import { AuthGuard } from 'src/guards/auth.guard';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('공지사항 API')
@ApiBearerAuth()
@Controller('notice')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) { }

  @Get()
  @UseGuardsOr(AdminGuard, AuthGuard)
  @ApiOperation({ summary: '공지사항 목록 조회', description: '모든 공지사항의 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '공지사항 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async fetchAll() {
    return await this.noticeService.noticeAll();
  }

  @Get(':id')
  @UseGuardsOr(AdminGuard, AuthGuard)
  @ApiOperation({ summary: '공지사항 상세 조회', description: '특정 공지사항의 상세 정보를 조회합니다.' })
  @ApiParam({ name: 'id', description: '조회할 공지사항의 ID' })
  @ApiResponse({ status: 200, description: '공지사항 상세 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  async fetchSpecific(@Param('id') id: string) {
    console.log(id)
    return await this.noticeService.noticeSpecific(+id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '공지사항 생성', description: '새로운 공지사항을 생성합니다.' })
  @ApiResponse({ status: 201, description: '공지사항 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async create(@Body() createNoticeDto: CreateNoticeDto) {
    return await this.noticeService.create(createNoticeDto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '공지사항 수정', description: '특정 공지사항의 정보를 수정합니다.' })
  @ApiParam({ name: 'id', description: '수정할 공지사항의 ID' })
  @ApiResponse({ status: 200, description: '공지사항 수정 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  async update(@Param('id') id: string, @Body() updateNoticeDto: UpdateNoticeDto) {
    return await this.noticeService.update(+id, updateNoticeDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '공지사항 삭제', description: '특정 공지사항을 삭제합니다.' })
  @ApiParam({ name: 'id', description: '삭제할 공지사항의 ID' })
  @ApiResponse({ status: 200, description: '공지사항 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  async remove(@Param('id') id: string) {
    return await this.noticeService.remove(+id);
  }
}
