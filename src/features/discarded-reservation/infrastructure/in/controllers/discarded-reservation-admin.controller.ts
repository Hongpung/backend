import {
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  ParseIntPipe,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAccessGuard } from 'src/security/presentation/guards/admin-access.guard';
import { ResponseValidationInterceptor } from 'src/common/validation/response-validation.interceptor';
import { ResponseSchema } from 'src/common/validation/response-schema.decorator';
import { DiscardedReservationListResponseDto } from '../dto/response/discarded-reservation.res.dto';
import { DiscardedReservationResponseMapper } from './mappers/discarded-reservation.response.mapper';
import { DiscardedReservationRequestMapper } from './mappers/discarded-reservation.request.mapper';
import {
  DiscardedReservationQueryUseCasePort,
  type DiscardedReservationQueryUseCasePort as IDiscardedReservationQueryUseCasePort,
} from '../../../application/ports/in/discarded-reservation-query.use-case.port';

@ApiTags('관리자 예약 API')
@ApiBearerAuth()
@UseInterceptors(ResponseValidationInterceptor)
@Controller('admin/reservation')
export class DiscardedReservationAdminController {
  constructor(
    @Inject(DiscardedReservationQueryUseCasePort)
    private readonly discardedReservationQueryUseCase: IDiscardedReservationQueryUseCasePort,
  ) {}

  @Get('discarded')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: 'discarded 예약 조회',
    description: '관리자가 discard 처리된 예약 목록을 조회합니다.',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: '페이지 번호(기본 0)',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: '페이지 사이즈(기본 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'discarded 예약 조회 성공',
    type: DiscardedReservationListResponseDto,
  })
  @ResponseSchema(DiscardedReservationListResponseDto)
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async getDiscardedReservations(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take?: number,
  ): Promise<DiscardedReservationListResponseDto> {
    const { skip: s, take: t } = DiscardedReservationRequestMapper.toListQuery(
      skip ?? 0,
      take ?? 20,
    );
    const discardedReservations =
      await this.discardedReservationQueryUseCase.getDiscardedReservations(
        s,
        t,
      );
    return DiscardedReservationResponseMapper.toListDto(discardedReservations);
  }
}
