import {
  Controller,
  Get,
  Param,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UseGuardsOr } from 'src/security/presentation/decorators/use-guards-or.decorator';
import { AdminAccessGuard } from 'src/security/presentation/guards/admin-access.guard';
import { UserAccessGuard } from 'src/security/presentation/guards/user-access.guard';
import { NoticeListResDto, NoticeResDto } from '../dto/response';
import { NoticeResponseMapper } from './mappers/notice.response.mapper';
import { NoticeMemberService } from '../services/notice-member.service';

@ApiTags('공지사항 API')
@ApiBearerAuth()
@Controller('notice')
export class NoticeMemberController {
  constructor(private readonly noticeMemberService: NoticeMemberService) {}

  @Get()
  @UseGuardsOr(AdminAccessGuard, UserAccessGuard)
  @ApiOperation({
    summary: '공지사항 목록 조회',
    description: '모든 공지사항의 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '공지사항 목록 조회 성공',
    type: NoticeListResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async fetchAll(): Promise<NoticeListResDto> {
    const notices = await this.noticeMemberService.findAll();
    return NoticeResponseMapper.toNoticeListResDto(notices);
  }

  @Get(':id')
  @UseGuardsOr(AdminAccessGuard, UserAccessGuard)
  @ApiOperation({
    summary: '공지사항 상세 조회',
    description: '특정 공지사항의 상세 정보를 조회합니다.',
  })
  @ApiParam({ name: 'id', description: '조회할 공지사항의 ID' })
  @ApiResponse({
    status: 200,
    description: '공지사항 상세 조회 성공',
    type: NoticeResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  async fetchSpecific(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NoticeResDto> {
    const notice = await this.noticeMemberService.findById(id);
    if (!notice) {
      throw new NotFoundException('Notice not found');
    }
    return NoticeResponseMapper.toNoticeResDto(notice);
  }
}
