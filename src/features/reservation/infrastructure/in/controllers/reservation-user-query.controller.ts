import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  DefaultValuePipe,
  ParseIntPipe,
  Inject,
} from '@nestjs/common';
import { ReservationDateQueryDto } from '../dto/request/reservation-date.query.dto';
import { ReservationTermQueryDto } from '../dto/request/reservation-term.query.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserAccessGuard } from 'src/security/presentation/guards/user-access.guard';
import { AdminAccessGuard } from 'src/security/presentation/guards/admin-access.guard';
import { UseGuardsOr } from 'src/security/presentation/decorators/use-guards-or.decorator';
import { ResponseSchema } from 'src/common/validation/response-schema.decorator';
import { ResponseValidationInterceptor } from 'src/common/validation/response-validation.interceptor';
import { MemberId } from 'src/security/presentation/decorators';
import { ReservationResponseDto } from '../dto/response/reservation.res.dto';
import { ReservationDetailResponseDto } from '../dto/response/reservation-detail.res.dto';
import { OccupiedTimeSlotResDto } from '../dto/response/occupied-time-slot.res.dto';
import { ReservationControllerResponseMapper } from './mappers/reservation-controller.response.mapper';
import {
  ReservationUserQueryUseCasePort,
  type ReservationUserQueryUseCasePort as IReservationUserQueryUseCasePort,
} from '../../../application/ports/in/reservation-user-query.use-case.port';

@ApiTags('예약 API (User Query)')
@ApiBearerAuth()
@UseInterceptors(ResponseValidationInterceptor)
@Controller('reservation')
export class ReservationUserQueryController {
  constructor(
    @Inject(ReservationUserQueryUseCasePort)
    private readonly reservationUserQueryUseCase: IReservationUserQueryUseCasePort,
  ) {}

  @Get('today')
  @UseGuardsOr(UserAccessGuard)
  @ApiOperation({ summary: '오늘의 예약 목록 조회(유즈케이스 포트)' })
  @ApiResponse({
    status: 200,
    description: '오늘의 예약 목록 조회 성공',
    type: [ReservationResponseDto],
  })
  @ResponseSchema(ReservationResponseDto, { isArray: true })
  async getTodayReservations(@MemberId() userId: number) {
    const entities =
      await this.reservationUserQueryUseCase.getTodayReservations({
        memberId: userId,
      });
    return ReservationControllerResponseMapper.toList(entities);
  }

  @Get('my-schedule')
  @UseGuards(UserAccessGuard)
  @ApiOperation({ summary: '다음 예약 목록 조회(유즈케이스 포트)' })
  @ApiResponse({
    status: 200,
    description: '다음 예약 목록 조회 성공',
    type: [ReservationResponseDto],
  })
  @ResponseSchema(ReservationResponseDto, { isArray: true })
  async getMyNextReservations(
    @MemberId() userId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
  ) {
    const entities =
      await this.reservationUserQueryUseCase.getUserNextReservations({
        memberId: userId,
        skip,
      });
    return ReservationControllerResponseMapper.toList(entities);
  }

  @Get('term')
  @UseGuardsOr(UserAccessGuard, AdminAccessGuard)
  @ApiOperation({ summary: '특정 기간 예약 목록 조회(유즈케이스 포트)' })
  @ApiResponse({
    status: 200,
    description: '특정 기간 예약 목록 조회 성공',
    type: [ReservationResponseDto],
  })
  @ResponseSchema(ReservationResponseDto, { isArray: true })
  async getReservationsOfTerm(@Query() query: ReservationTermQueryDto) {
    const entities =
      await this.reservationUserQueryUseCase.getReservationsByTerm({
        startDateString: query['start-date'],
        endDateString: query['end-date'],
      });
    return ReservationControllerResponseMapper.toList(entities);
  }

  @Get('month-calendar')
  @UseGuardsOr(UserAccessGuard, AdminAccessGuard)
  @ApiOperation({ summary: '특정 월 예약 목록 조회(유즈케이스 포트)' })
  @ApiResponse({
    status: 200,
    description: '특정 월 예약 목록 조회 성공',
    type: [ReservationResponseDto],
  })
  @ResponseSchema(ReservationResponseDto, { isArray: true })
  async getMonthlyReservations(
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    const entities =
      await this.reservationUserQueryUseCase.getReservationsByMonth({
        year,
        month,
      });
    return ReservationControllerResponseMapper.toList(entities);
  }

  @Get('daily')
  @UseGuardsOr(UserAccessGuard, AdminAccessGuard)
  @ApiOperation({ summary: '특정 날짜 예약 목록 조회(유즈케이스 포트)' })
  @ApiResponse({
    status: 200,
    description: '특정 날짜 예약 목록 조회 성공',
    type: [ReservationResponseDto],
  })
  @ResponseSchema(ReservationResponseDto, { isArray: true })
  async getDailyReservations(@Query() query: ReservationDateQueryDto) {
    const entities =
      await this.reservationUserQueryUseCase.getReservationsByDate({
        dateString: query.date,
      });
    return ReservationControllerResponseMapper.toList(entities);
  }

  @Get('daily/occupied')
  @UseGuardsOr(UserAccessGuard, AdminAccessGuard)
  @ApiOperation({ summary: '특정 날짜 점유 시간 조회(유즈케이스 포트)' })
  @ApiResponse({
    status: 200,
    description: '특정 날짜 점유 시간 조회 성공',
    type: [OccupiedTimeSlotResDto],
  })
  @ResponseSchema(OccupiedTimeSlotResDto, { isArray: true })
  async getOccupiedTimesOnDate(@Query() query: ReservationDateQueryDto) {
    const rows = await this.reservationUserQueryUseCase.getOccupiedTimesOnDate({
      dateString: query.date,
    });
    return ReservationControllerResponseMapper.toOccupiedList(rows);
  }

  @Get(':reservationId')
  @UseGuardsOr(UserAccessGuard, AdminAccessGuard)
  @ApiOperation({ summary: '예약 상세 조회(유즈케이스 포트)' })
  @ApiParam({ name: 'reservationId', description: '조회할 예약의 ID' })
  @ApiResponse({
    status: 200,
    description: '예약 상세 조회 성공',
    type: ReservationDetailResponseDto,
  })
  @ResponseSchema(ReservationDetailResponseDto)
  async getReservationDetail(
    @Param('reservationId', ParseIntPipe) reservationId: number,
  ) {
    const entity = await this.reservationUserQueryUseCase.getReservationDetail({
      reservationId,
    });
    if (!entity) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    return ReservationControllerResponseMapper.toDetail(entity);
  }
}
