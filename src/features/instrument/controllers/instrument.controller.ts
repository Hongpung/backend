import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
import { UseGuardsOr } from 'src/security/presentation/decorators/use-guards-or.decorator';
import { MemberClubId, MemberId } from 'src/security/presentation/decorators';
import { AdminAccessGuard } from 'src/security/presentation/guards/admin-access.guard';
import { UserAccessGuard } from 'src/security/presentation/guards/user-access.guard';
import { CreateInstrumentReqDto, UpdateInstrumentReqDto } from '../dto/request';
import {
  CreateInstrumentResDto,
  DeleteInstrumentResDto,
  InstrumentDetailResDto,
  InstrumentResDto,
  UpdateInstrumentResDto,
} from '../dto/response';
import { InstrumentRequestMapper } from './mappers/instrument.request.mapper';
import { InstrumentResponseMapper } from './mappers/instrument.response.mapper';
import { InstrumentService } from '../services/instrument.service';

@ApiTags('악기 API')
@ApiBearerAuth()
@Controller('instrument')
export class InstrumentController {
  constructor(private readonly instrumentService: InstrumentService) {}

  @Get('borrow-list')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '대여 가능한 악기 목록 조회',
    description: '현재 대여 가능한 악기들의 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '대여 가능한 악기 목록 조회 성공',
    type: [InstrumentResDto],
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async fetchBorrowPossibleList(
    @MemberClubId() clubId: number | null,
  ): Promise<InstrumentResDto[]> {
    const instruments = await this.instrumentService.findBorrowableList(clubId);
    return instruments.map((i) =>
      InstrumentResponseMapper.toInstrumentResDto(i),
    );
  }

  @Get(':instrumentId')
  @UseGuardsOr(AdminAccessGuard, UserAccessGuard)
  @ApiOperation({
    summary: '악기 상세 조회',
    description:
      '특정 악기의 상세 정보를 조회합니다. borrowHistory는 최신 10개만 반환합니다.',
  })
  @ApiParam({ name: 'instrumentId', description: '조회할 악기의 ID' })
  @ApiResponse({
    status: 200,
    description: '악기 상세 조회 성공',
    type: InstrumentDetailResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '악기를 찾을 수 없음' })
  async findOne(
    @Param('instrumentId', ParseIntPipe) instrumentId: number,
  ): Promise<InstrumentDetailResDto> {
    const instrument = await this.instrumentService.findDetail(instrumentId);
    if (!instrument) {
      throw new NotFoundException('악기를 찾을 수 없습니다.');
    }
    return InstrumentResponseMapper.toInstrumentDetailResDto(instrument);
  }

  @Post('create')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '악기 생성',
    description: '새로운 악기를 생성합니다.',
  })
  @ApiBody({ type: CreateInstrumentReqDto })
  @ApiResponse({
    status: 201,
    description: '악기 생성 성공',
    type: CreateInstrumentResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async create(
    @Body() dto: CreateInstrumentReqDto,
    @MemberId() memberId: number,
  ): Promise<CreateInstrumentResDto> {
    const params = InstrumentRequestMapper.toCreateParams(dto);
    const instrument = await this.instrumentService.create(memberId, params);
    return InstrumentResponseMapper.toCreateInstrumentResDto(instrument);
  }

  @Patch(':instrumentId')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '악기 수정',
    description: '특정 악기의 정보를 수정합니다.',
  })
  @ApiParam({ name: 'instrumentId', description: '수정할 악기의 ID' })
  @ApiBody({ type: UpdateInstrumentReqDto })
  @ApiResponse({
    status: 200,
    description: '악기 수정 성공',
    type: UpdateInstrumentResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '악기를 찾을 수 없음' })
  async update(
    @Param('instrumentId', ParseIntPipe) instrumentId: number,
    @Body() dto: UpdateInstrumentReqDto,
    @MemberId() memberId: number,
  ): Promise<UpdateInstrumentResDto> {
    const params = InstrumentRequestMapper.toUpdateParams(dto);
    const instrument = await this.instrumentService.update(
      memberId,
      instrumentId,
      params,
    );
    return InstrumentResponseMapper.toUpdateInstrumentResDto(instrument);
  }

  @Delete(':instrumentId')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '악기 삭제',
    description: '특정 악기를 삭제합니다.',
  })
  @ApiParam({ name: 'instrumentId', description: '삭제할 악기의 ID' })
  @ApiResponse({
    status: 200,
    description: '악기 삭제 성공',
    type: DeleteInstrumentResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '악기를 찾을 수 없음' })
  async remove(
    @Param('instrumentId', ParseIntPipe) instrumentId: number,
    @MemberId() memberId: number,
  ): Promise<DeleteInstrumentResDto> {
    await this.instrumentService.remove(memberId, instrumentId);
    return InstrumentResponseMapper.toDeleteInstrumentResDto();
  }
}
