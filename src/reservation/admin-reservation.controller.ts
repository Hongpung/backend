import { Controller, Body, Param, Delete, Patch, UseGuards, Req, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { Request } from 'express';
import { CreateReservationDto, ForceCreateReservationDto } from './dto/create-reservation.dto';
import { AdminGuard } from 'src/guards/admin.guard';
import { reservationType } from '@prisma/client';
import { BatchReservtionDTO } from './dto/batch-reservation.dto';
import { AdminReservationService } from './admin-reservation.service';

@ApiTags('관리자 예약 API')
@ApiBearerAuth()
@Controller('admin/reservation')
export class AdminReservationController {
    constructor(private readonly reservationService: AdminReservationService) { }

    @Post('')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: '예약 강제 생성', description: '관리자가 예약을 강제로 생성합니다.' })
    @ApiResponse({ status: 201, description: '예약 강제 생성 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
    async forceCreateReservation(@Body() createReservationDto: ForceCreateReservationDto, @Req() req: Request) {
        const { adminId } = req.admin
        console.log(createReservationDto)
        return await this.reservationService.adminCreateReservation({ createReservationDto, adminId: +adminId })
    }

    @Delete(':reservationId')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: '예약 강제 삭제', description: '관리자가 예약을 강제로 삭제합니다.' })
    @ApiParam({ name: 'reservationId', description: '삭제할 예약의 ID' })
    @ApiResponse({ status: 200, description: '예약 강제 삭제 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
    async forceDeleteReservation(@Param('reservationId') reservationId: string, @Req() req: Request) {
        const { adminId } = req.admin
        return await this.reservationService.adminForceDeleteReservation({ reservationId: +reservationId, adminId: +adminId })
    }

    @Patch(':reservationId')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: '예약 수정', description: '관리자가 예약을 수정합니다.' })
    @ApiParam({ name: 'reservationId', description: '수정할 예약의 ID' })
    @ApiResponse({ status: 200, description: '예약 수정 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
    async modifyReservation(@Param('reservationId') reservationId: string, @Body() updateReservationDto: CreateReservationDto, @Req() req: Request) {
        const { adminId } = req.admin
        console.log(reservationId)
        return await this.reservationService.adminEditReservation({ adminId: +adminId, reservationId: +reservationId, updateReservationDto })
    }

    @Post('batch')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: '일괄 예약 생성', description: '관리자가 일괄 예약을 생성합니다.' })
    @ApiResponse({ status: 201, description: '일괄 예약 생성 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
    async batchCreateReservation(@Body() batchReservationDTO: BatchReservtionDTO<reservationType>, @Req() req: Request) {
        console.log('called')
        const { adminId } = req.admin
        this.reservationService.adminRigisterRoutineReservation(adminId, batchReservationDTO)
    }
}


