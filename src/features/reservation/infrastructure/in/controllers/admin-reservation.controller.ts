import {
  Controller,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  Req,
  Post,
  ParseIntPipe,
  UseInterceptors,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

import { Request } from 'express';
import { ForceCreateReservationDto } from '../dto/request/create-reservation.req.dto';
import { AdminAccessGuard } from 'src/security/presentation/guards/admin-access.guard';
import { BatchReservtionDTO } from '../dto/request/batch-reservation.req.dto';

import { ForceUpdateReservationDto } from '../dto/request/update-reservation.req.dto';
import { ResponseValidationInterceptor } from 'src/common/validation/response-validation.interceptor';
import { ReservationType } from 'src/features/reservation/reservation.types';
import { ReservationControllerRequestMapper } from './mappers/reservation-controller.request.mapper';
import {
  ReservationAdminCommandUseCasePort,
  type ReservationAdminCommandUseCasePort as IReservationAdminCommandUseCasePort,
} from '../../../application/ports/in/reservation-admin-command.use-case.port';
import {
  AdminModifyReservationResDto,
  ReservationCommandMessageResDto,
} from '../dto/response/reservation-command.res.dto';

@ApiTags('관리자 예약 API')
@ApiBearerAuth()
@UseInterceptors(ResponseValidationInterceptor)
@Controller('admin/reservation')
export class AdminReservationController {
  constructor(
    @Inject(ReservationAdminCommandUseCasePort)
    private readonly reservationAdminService: IReservationAdminCommandUseCasePort,
  ) {}

  @Post('')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '예약 강제 생성',
    description: '관리자가 예약을 강제로 생성합니다.',
  })
  @ApiBody({ type: ForceCreateReservationDto })
  @ApiResponse({
    status: 201,
    description: '예약 강제 생성 성공',
    type: ReservationCommandMessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async forceCreateReservation(
    @Body() createReservationDto: ForceCreateReservationDto,
    @Req() req: Request,
  ) {
    const { adminId } = req.admin;
    const input =
      ReservationControllerRequestMapper.toForceCreateReservationInput(
        createReservationDto,
      );
    return await this.reservationAdminService.forceCreateReservation(
      input,
      +adminId,
    );
  }

  @Delete(':reservationId')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '예약 강제 삭제',
    description: '관리자가 예약을 강제로 삭제합니다.',
  })
  @ApiParam({ name: 'reservationId', description: '삭제할 예약의 ID' })
  @ApiResponse({
    status: 200,
    description: '예약 강제 삭제 성공',
    type: ReservationCommandMessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async forceDeleteReservation(
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Req() req: Request,
  ) {
    const { adminId } = req.admin;
    return await this.reservationAdminService.forceDeleteReservation(
      reservationId,
      +adminId,
    );
  }

  @Patch(':reservationId')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '예약 수정',
    description: '관리자가 예약을 수정합니다.',
  })
  @ApiParam({ name: 'reservationId', description: '수정할 예약의 ID' })
  @ApiBody({ type: ForceUpdateReservationDto })
  @ApiResponse({
    status: 200,
    description: '예약 수정 성공',
    type: AdminModifyReservationResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async modifyReservation(
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Body() updateReservationDto: ForceUpdateReservationDto,
    @Req() req: Request,
  ) {
    const { adminId } = req.admin;
    const input =
      ReservationControllerRequestMapper.toForceUpdateReservationInput(
        updateReservationDto,
      );
    return await this.reservationAdminService.modifyReservation(
      reservationId,
      +adminId,
      input,
    );
  }

  @Post('batch')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '일괄 예약 생성',
    description: '관리자가 일괄 예약을 생성합니다.',
  })
  @ApiBody({ type: BatchReservtionDTO })
  @ApiResponse({
    status: 201,
    description: '일괄 예약 생성 성공',
    type: ReservationCommandMessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async batchCreateReservation(
    @Body() batchReservationDTO: BatchReservtionDTO<ReservationType>,
    @Req() req: Request,
  ) {
    const { adminId } = req.admin;
    const batchInput =
      ReservationControllerRequestMapper.toBatchReservationInput(
        batchReservationDTO,
      );
    return await this.reservationAdminService.batchCreateReservations(
      +adminId,
      batchInput,
    );
  }
}
