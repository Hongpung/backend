import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Inject,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserAccessGuard } from 'src/security/presentation/guards/user-access.guard';
import { CreateReservationDto } from '../dto/request/create-reservation.req.dto';
import { UpdateReservationDto } from '../dto/request/update-reservation.req.dto';
import { MemberId } from 'src/security/presentation/decorators';
import { ReservationControllerRequestMapper } from './mappers/reservation-controller.request.mapper';
import {
  ReservationUserCommandUseCasePort,
  type ReservationUserCommandUseCasePort as IReservationUserCommandUseCasePort,
} from '../../../application/ports/in/reservation-user-command.use-case.port';
import {
  ReservationCommandMessageResDto,
  ReservationCreatedResDto,
} from '../dto/response/reservation-command.res.dto';

@ApiTags('예약 API (User Command)')
@ApiBearerAuth()
@Controller('reservation')
export class ReservationUserCommandController {
  constructor(
    @Inject(ReservationUserCommandUseCasePort)
    private readonly reservationUserCommandUseCase: IReservationUserCommandUseCasePort,
  ) {}

  @Post('')
  @UseGuards(UserAccessGuard)
  @ApiOperation({ summary: '예약 생성(유즈케이스 포트)' })
  @ApiBody({ type: CreateReservationDto })
  @ApiResponse({
    status: 201,
    description: '예약 생성 성공',
    type: ReservationCreatedResDto,
  })
  async createReservation(
    @Body() createReservationDto: CreateReservationDto,
    @MemberId() userId: number,
  ) {
    const input =
      ReservationControllerRequestMapper.toCreateReservationInput(
        createReservationDto,
      );
    return await this.reservationUserCommandUseCase.createReservation({
      input,
      memberId: userId,
    });
  }

  @Patch(':reservationId')
  @UseGuards(UserAccessGuard)
  @ApiOperation({ summary: '예약 수정(유즈케이스 포트)' })
  @ApiParam({ name: 'reservationId', description: '수정할 예약의 ID' })
  @ApiBody({ type: UpdateReservationDto })
  @ApiResponse({
    status: 200,
    description: '예약 수정 성공',
    type: ReservationCommandMessageResDto,
  })
  async updateReservation(
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Body() updateReservationDto: UpdateReservationDto,
    @MemberId() userId: number,
  ) {
    const input =
      ReservationControllerRequestMapper.toUpdateReservationInput(
        updateReservationDto,
      );
    return await this.reservationUserCommandUseCase.updateReservation({
      reservationId,
      creatorId: userId,
      input,
    });
  }

  @Post(':reservationId/leave')
  @UseGuards(UserAccessGuard)
  @ApiOperation({ summary: '예약 취소(유즈케이스 포트)' })
  @ApiParam({ name: 'reservationId', description: '취소할 예약의 ID' })
  @ApiResponse({
    status: 200,
    description: '예약 취소 성공',
    type: ReservationCommandMessageResDto,
  })
  async leaveReservation(
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @MemberId() userId: number,
  ) {
    return await this.reservationUserCommandUseCase.leaveReservation({
      reservationId,
      memberId: userId,
    });
  }

  @Delete(':reservationId')
  @UseGuards(UserAccessGuard)
  @ApiOperation({ summary: '예약 삭제(유즈케이스 포트)' })
  @ApiParam({ name: 'reservationId', description: '삭제할 예약의 ID' })
  @ApiResponse({
    status: 200,
    description: '예약 삭제 성공',
    type: ReservationCommandMessageResDto,
  })
  async deleteReservation(
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @MemberId() userId: number,
  ) {
    return await this.reservationUserCommandUseCase.deleteReservation({
      reservationId,
      creatorId: userId,
    });
  }
}
