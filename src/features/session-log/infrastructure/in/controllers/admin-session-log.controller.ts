import {
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionLogDateQueryDto } from '../dto/request/session-log-date.query.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAccessGuard } from 'src/security/presentation/guards/admin-access.guard';
import {
  AdminSessionLogQueryUseCasePort,
  AdminSessionLogQueryUseCasePort as AdminSessionLogQueryUseCasePortToken,
} from '../../../application/ports/in/admin-session-log-query.use-case.port';
import {
  AdminSessionCalendarDayReadModel,
  AdminSessionLogDetailReadModel,
} from '../../../domain/read-models/admin-session-log.read-model';
import {
  AdminSessionCalendarDayResDto,
  AdminSessionLogDetailResDto,
} from '../dto/response/admin-session-log.res.dto';
import { AdminSessionLogResponseMapper } from './mappers/admin-session-log.response.mapper';

@ApiTags('관리자 세션 로그 API')
@ApiBearerAuth()
@Controller('admin/session-log')
export class AdminSessionLogController {
  constructor(
    @Inject(AdminSessionLogQueryUseCasePortToken)
    private readonly queryUseCase: AdminSessionLogQueryUseCasePort,
  ) {}

  @Get('list')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({ summary: '최신 세션 로그 목록' })
  @ApiQuery({ name: 'skip', required: false, description: '페이지(기본 0)' })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
    type: [AdminSessionLogDetailResDto],
  })
  async getLatestSessionLogs(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ): Promise<AdminSessionLogDetailReadModel[]> {
    const rows = await this.queryUseCase.getLatestSessionLogs(skip);
    return AdminSessionLogResponseMapper.toLatestList(rows);
  }

  @Get('month-calendar')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({ summary: '관리자 월별 세션 캘린더' })
  @ApiQuery({ name: 'year', description: '연도' })
  @ApiQuery({ name: 'month', description: '월 (1~12)' })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
    type: [AdminSessionCalendarDayResDto],
  })
  async getAdminSessionCalendar(
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ): Promise<AdminSessionCalendarDayReadModel[]> {
    const rows = await this.queryUseCase.getAdminSessionCalendarForMonth(
      year,
      month,
    );
    return AdminSessionLogResponseMapper.toMonthCalendar(rows);
  }

  @Get('daily')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({ summary: '관리자 일별 세션 로그 목록' })
  @ApiQuery({ name: 'date', description: '조회할 날짜 (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
    type: [AdminSessionLogDetailResDto],
  })
  async getAdminSessionLogsByDate(
    @Query() query: SessionLogDateQueryDto,
  ): Promise<AdminSessionLogDetailReadModel[]> {
    const rows = await this.queryUseCase.getAdminSessionLogsByDate(query.date);
    return AdminSessionLogResponseMapper.toDailyList(rows);
  }
}
