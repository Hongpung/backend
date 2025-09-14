import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { CreateNoticeReqDto, UpdateNoticeReqDto } from '../dto/request';
import {
  CreateNoticeResDto,
  UpdateNoticeResDto,
  DeleteNoticeResDto,
} from '../dto/response';
import { NoticeResponseMapper } from './mappers/notice.response.mapper';
import { NoticeRequestMapper } from './mappers/notice.request.mapper';
import { NoticeAdminService } from '../services/notice-admin.service';

@ApiTags('공지사항 API')
@ApiBearerAuth()
@Controller('notice')
export class NoticeAdminController {
  constructor(private readonly noticeAdminService: NoticeAdminService) {}

  @Post()
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '공지사항 생성',
    description: '새로운 공지사항을 생성합니다.',
  })
  @ApiBody({ type: CreateNoticeReqDto })
  @ApiResponse({
    status: 201,
    description: '공지사항 생성 성공',
    type: CreateNoticeResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async create(@Body() dto: CreateNoticeReqDto): Promise<CreateNoticeResDto> {
    const params = NoticeRequestMapper.toCreateParams(dto);
    await this.noticeAdminService.create(params);
    return NoticeResponseMapper.toCreateNoticeResDto();
  }

  @Patch(':id')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '공지사항 수정',
    description: '특정 공지사항의 정보를 수정합니다.',
  })
  @ApiParam({ name: 'id', description: '수정할 공지사항의 ID' })
  @ApiBody({ type: UpdateNoticeReqDto })
  @ApiResponse({
    status: 200,
    description: '공지사항 수정 성공',
    type: UpdateNoticeResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNoticeReqDto,
  ): Promise<UpdateNoticeResDto> {
    const params = NoticeRequestMapper.toUpdateParams(dto);
    await this.noticeAdminService.update(id, params);
    return NoticeResponseMapper.toUpdateNoticeResDto();
  }

  @Delete(':id')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '공지사항 삭제',
    description: '특정 공지사항을 삭제합니다.',
  })
  @ApiParam({ name: 'id', description: '삭제할 공지사항의 ID' })
  @ApiResponse({
    status: 200,
    description: '공지사항 삭제 성공',
    type: DeleteNoticeResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DeleteNoticeResDto> {
    await this.noticeAdminService.remove(id);
    return NoticeResponseMapper.toDeleteNoticeResDto();
  }
}
