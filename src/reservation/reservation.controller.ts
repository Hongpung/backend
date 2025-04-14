import { Controller, Get, Body, Param, Delete, Patch, UseGuards, Req, Query, Post, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { AuthGuard } from 'src/guards/auth.guard';
import { Request } from 'express';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { AdminGuard } from 'src/guards/admin.guard';
import { UseGuardsOr } from 'src/decorators/use-guards-or.decorator';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@ApiTags('예약 API')
@ApiBearerAuth()
@Controller('reservation')
export class ReservationController {
    constructor(private readonly reservationService: ReservationService) { }

    @Get('today')
    @UseGuardsOr(AuthGuard)
    @ApiOperation({ summary: '오늘의 예약 목록 조회', description: '사용자의 오늘의 예약 목록을 조회합니다.' })
    @ApiResponse({ status: 200, description: '오늘의 예약 목록 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async getTodayReservations(
        @Req() req: Request,
    ) {
        const { memberId } = req.user;
        return await this.reservationService.getTodayReservations(+memberId);
    }

    @Get('my-schedule')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '다음 예약 목록 조회', description: '사용자의 다음 예약 목록을 조회합니다.' })
    @ApiResponse({ status: 200, description: '다음 예약 목록 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async getMyNextReservations(
        @Req() req: Request,
        @Query('skip') skip?: string
    ) {
        const { memberId } = req.user;
        return await this.reservationService.getUserNextReservations(+memberId, +skip)
    }

    @Get('term')
    @UseGuardsOr(AuthGuard, AdminGuard)
    @ApiOperation({ summary: '특정 기간의 예약 목록 조회', description: '특정 기간의 예약 목록을 조회합니다.' })
    @ApiResponse({ status: 200, description: '특정 기간의 예약 목록 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 403, description: '관리자 권한이 필요합니다.' })
    async getReservationsOfTerm(
        @Query('start-date') startDateString: string,
        @Query('end-date') endDateString: string) {
        return await this.reservationService.getReservationsOfTerm({ startDateString, endDateString })
    }

    @Get('month-calendar')
    @UseGuardsOr(AuthGuard, AdminGuard)
    @ApiOperation({ summary: '특정 월의 예약 목록 조회', description: '특정 월의 예약 목록을 조회합니다.' })
    @ApiResponse({ status: 200, description: '특정 월의 예약 목록 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 403, description: '관리자 권한이 필요합니다.' })
    async getMonthlyReservations(
        @Query('year') year: string,
        @Query('month') month: string) {
        return await this.reservationService.getReservationsByMonth({ year: +year, month: +month })
    }

    @Get('daily')
    @UseGuardsOr(AuthGuard, AdminGuard)
    @ApiOperation({ summary: '특정 날짜의 예약 목록 조회', description: '특정 날짜의 예약 목록을 조회합니다.' })
    @ApiResponse({ status: 200, description: '특정 날짜의 예약 목록 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 403, description: '관리자 권한이 필요합니다.' })
    async getDailyReservations(
        @Query('date') date: string,) {
        return await this.reservationService.getReservationsByDate({ date })
    }

    @Get('daily/occupied')
    @UseGuardsOr(AuthGuard, AdminGuard)
    @ApiOperation({ summary: '특정 날짜의 예약 가능 시간 조회', description: '특정 날짜의 예약 가능 시간을 조회합니다.' })
    @ApiResponse({ status: 200, description: '특정 날짜의 예약 가능 시간 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 403, description: '관리자 권한이 필요합니다.' })
    async getOccupiedTimesOnDate(
        @Query('date') date: string,) {
        return await this.reservationService.getOccupiedTimesOnDate({ date })
    }

    @Post('')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '예약 생성', description: '새로운 예약을 생성합니다.' })
    @ApiResponse({ status: 201, description: '예약 생성 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async createReservation(@Body() createReservationDto: CreateReservationDto, @Req() req: Request) {
        if (!req.user) {
            throw new UnauthorizedException('User not authenticated');
        }
        const { memberId } = req.user;
        return await this.reservationService.createReservation({ createReservationDto, memberId })
    }

    @Get(':reservationId')
    @UseGuardsOr(AuthGuard, AdminGuard)
    @ApiOperation({ summary: '예약 상세 조회', description: '특정 예약의 상세 정보를 조회합니다.' })
    @ApiParam({ name: 'reservationId', description: '조회할 예약의 ID' })
    @ApiResponse({ status: 200, description: '예약 상세 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 403, description: '관리자 권한이 필요합니다.' })
    @ApiResponse({ status: 404, description: '예약을 찾을 수 없음' })
    async getReservationDetail(@Param('reservationId') reservationId: number) {
        return await this.reservationService.getReservationDetail(+reservationId)
    }

    @Patch(':reservationId')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '예약 수정', description: '특정 예약의 정보를 수정합니다.' })
    @ApiParam({ name: 'reservationId', description: '수정할 예약의 ID' })
    @ApiResponse({ status: 200, description: '예약 수정 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 404, description: '예약을 찾을 수 없음' })
    async updateReservation(@Param('reservationId') reservationId: number, @Body() updateReservationDto: UpdateReservationDto, @Req() req: Request) {
        const { memberId } = req.user
        console.log({ creatorId: +memberId, reservationId: +reservationId }, updateReservationDto)
        return await this.reservationService.updateReservation({ creatorId: +memberId, reservationId: +reservationId, updateReservationDto })
    }

    @Post(':reservationId/leave')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '예약 취소', description: '특정 예약을 취소합니다.' })
    @ApiParam({ name: 'reservationId', description: '취소할 예약의 ID' })
    @ApiResponse({ status: 200, description: '예약 취소 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 404, description: '예약을 찾을 수 없음' })
    async leaveReservation(@Param('reservationId') reservationId: number, @Req() req: Request) {
        const { memberId } = req.user
        return await this.reservationService.leaveReservation({ reservationId: +reservationId, memberId })
    }

    @Delete(':reservationId')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '예약 삭제', description: '특정 예약을 삭제합니다.' })
    @ApiParam({ name: 'reservationId', description: '삭제할 예약의 ID' })
    @ApiResponse({ status: 200, description: '예약 삭제 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 404, description: '예약을 찾을 수 없음' })
    async deleteReservation(@Param('reservationId') reservationId: string, @Req() req: Request) {
        const { memberId } = req.user
        return await this.reservationService.deleteReservation({ reservationId: +reservationId, creatorId: memberId })
    }

}


