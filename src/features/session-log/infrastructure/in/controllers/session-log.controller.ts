import {
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MemberId, UseGuardsOr } from 'src/security/presentation/decorators';
import { AdminAccessGuard } from 'src/security/presentation/guards/admin-access.guard';
import { UserAccessGuard } from 'src/security/presentation/guards/user-access.guard';
import {
  SessionLogQueryUseCasePort,
  SessionLogQueryUseCasePort as SessionLogQueryUseCasePortToken,
} from '../../../application/ports/in/session-log-query.use-case.port';
import { SessionLogResponseMapper } from './mappers/session-log.response.mapper';
import { SessionLogResDto } from '../dto/response/session-log.res.dto';
import { SessionLogDetailResDto } from '../dto/response/session-log-detail.res.dto';

@ApiTags('세션 로그 API')
@ApiBearerAuth()
@Controller('session-log')
export class SessionLogController {
  constructor(
    @Inject(SessionLogQueryUseCasePortToken)
    private readonly queryUseCase: SessionLogQueryUseCasePort,
  ) {}

  @Get('')
  @UseGuards(UserAccessGuard)
  @ApiOperation({ summary: '월별 세션 로그 조회' })
  @ApiQuery({ name: 'year', description: '조회할 연도' })
  @ApiQuery({ name: 'month', description: '조회할 월(1~12)' })
  @ApiResponse({
    status: 200,
    description: '세션 로그 조회 성공',
    type: [SessionLogResDto],
  })
  async getUserMonthlySessionLogs(
    @MemberId() memberId: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    const rows = await this.queryUseCase.getUserMonthlySessionLogs({
      memberId,
      year,
      month,
    });
    return SessionLogResponseMapper.toMonthlyList(rows);
  }

  @Get('club')
  @UseGuards(UserAccessGuard)
  @ApiOperation({ summary: '클럽 월별 세션 로그 조회' })
  @ApiQuery({ name: 'year', description: '조회할 연도' })
  @ApiQuery({ name: 'month', description: '조회할 월(1~12)' })
  @ApiResponse({
    status: 200,
    description: '클럽 세션 로그 조회 성공',
    type: [SessionLogResDto],
  })
  async getClubMonthlySessionLogs(
    @MemberId() memberId: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    const rows = await this.queryUseCase.getClubMonthlySessionLogs({
      memberId,
      year,
      month,
    });
    return SessionLogResponseMapper.toMonthlyList(rows);
  }

  @Get('specific/:sessionId')
  @UseGuardsOr(UserAccessGuard, AdminAccessGuard)
  @ApiOperation({ summary: '세션 상세 정보 조회' })
  @ApiParam({ name: 'sessionId', description: '조회할 세션의 ID' })
  @ApiResponse({
    status: 200,
    description: '세션 상세 정보 조회 성공',
    type: SessionLogDetailResDto,
  })
  async getSpecificSessionInfo(
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    const row = await this.queryUseCase.getSessionInfoBySessionId({
      sessionId,
    });
    return SessionLogResponseMapper.toDetail(row);
  }

  @Get('specific/reservation/:reservationId')
  @UseGuards(UserAccessGuard)
  @ApiOperation({ summary: '예약별 세션 정보 조회' })
  @ApiParam({ name: 'reservationId', description: '조회할 예약의 ID' })
  @ApiResponse({
    status: 200,
    description: '예약별 세션 정보 조회 성공',
    type: SessionLogDetailResDto,
  })
  async getSpecificSessionInfoByReservaionId(
    @Param('reservationId', ParseIntPipe) reservationId: number,
  ) {
    const row = await this.queryUseCase.getSessionInfoByReservationId({
      reservationId,
    });
    return SessionLogResponseMapper.toDetail(row);
  }
}
