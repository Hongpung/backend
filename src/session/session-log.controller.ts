import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import { Request } from 'express';
import { SessionLogService } from './session-log.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('세션 로그 API')
@ApiBearerAuth()
@Controller('session-log')
export class SessionLogController {
    constructor(
        private readonly sessionLogService: SessionLogService
    ) { }

    @Get('')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '월별 세션 로그 조회', description: '사용자의 월별 세션 로그를 조회합니다.' })
    @ApiQuery({ name: 'year', description: '조회할 연도' })
    @ApiQuery({ name: 'month', description: '조회할 월' })
    @ApiResponse({ status: 200, description: '세션 로그 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async getUserMonthlySessionLogs(@Req() req: Request,
        @Query('year') year: string,
        @Query('month') month: string
    ) {
        const { memberId } = req.user;
        return this.sessionLogService.getUserMonthlySessionLogs(+memberId, +year, +month)
    }

    @Get('club')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '클럽 월별 세션 로그 조회', description: '사용자의 클럽 월별 세션 로그를 조회합니다.' })
    @ApiQuery({ name: 'year', description: '조회할 연도' })
    @ApiQuery({ name: 'month', description: '조회할 월' })
    @ApiResponse({ status: 200, description: '클럽 세션 로그 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async getClubMonthlySessionLogs(@Req() req: Request,
        @Query('year') year: string,
        @Query('month') month: string
    ) {
        const { memberId } = req.user;
        return this.sessionLogService.getClubOfUserMonthlySessionLogs(+memberId, +year, +month)
    }

    @Get('specific/:sessionId')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '세션 상세 정보 조회', description: '특정 세션의 상세 정보를 조회합니다.' })
    @ApiParam({ name: 'sessionId', description: '조회할 세션의 ID' })
    @ApiResponse({ status: 200, description: '세션 상세 정보 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 404, description: '세션을 찾을 수 없음' })
    async getSpecificSessionInfo(@Param('sessionId') sessionId: number) {
        return this.sessionLogService.getSessionInfoBySessionId(+sessionId)
    }

    @Get('specific/reservation/:reservationId')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '예약별 세션 정보 조회', description: '특정 예약의 세션 정보를 조회합니다.' })
    @ApiParam({ name: 'reservationId', description: '조회할 예약의 ID' })
    @ApiResponse({ status: 200, description: '예약별 세션 정보 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 404, description: '예약을 찾을 수 없음' })
    async getSpecificSessionInfoByReservaionId(@Param('reservationId') reservationId: number) {
        return this.sessionLogService.getSessionInfoByReservatinId(+reservationId)
    }
}
