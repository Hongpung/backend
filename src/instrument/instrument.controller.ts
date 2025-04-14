import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { InstrumentService } from './instrument.service';
import { CreateInstrumentDto } from './dto/create-instrument.dto';
import { UpdateInstrumentDto } from './dto/update-instrument.dto';
import { AdminGuard } from 'src/guards/admin.guard';
import { UseGuardsOr } from 'src/decorators/use-guards-or.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('악기 API')
@ApiBearerAuth()
@Controller('instrument')
export class InstrumentController {
  constructor(private readonly instrumentService: InstrumentService) { }

  // @Get('admin')
  // @UseGuards(AdminGuard)
  // async findAll() {
  //   return await this.instrumentService.findAll();
  // }

  @Get('borrow-list')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '대여 가능한 악기 목록 조회', description: '현재 대여 가능한 악기들의 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '대여 가능한 악기 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async fetchBorrowPossibleList(@Req() req: Request) {
    const { clubId } = req.user;
    return await this.instrumentService.borrowPossibleList(+clubId);
  }

  @Get(':instrumentId')
  @UseGuardsOr(AdminGuard, AuthGuard)
  @ApiOperation({ summary: '악기 상세 조회', description: '특정 악기의 상세 정보를 조회합니다.' })
  @ApiParam({ name: 'instrumentId', description: '조회할 악기의 ID' })
  @ApiResponse({ status: 200, description: '악기 상세 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '악기를 찾을 수 없음' })
  async findOne(@Param('instrumentId') instrumentId: string) {
    return await this.instrumentService.findDetail(+instrumentId);
  }

  @Post('create')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '악기 생성', description: '새로운 악기를 생성합니다.' })
  @ApiResponse({ status: 201, description: '악기 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async create(@Body() createInstrumentDto: CreateInstrumentDto, @Req() req: Request) {
    const { memberId } = req.user;
    return this.instrumentService.create({ memberId, createInstrumentDto });
  }

  @Patch(':instrumentId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '악기 수정', description: '특정 악기의 정보를 수정합니다.' })
  @ApiParam({ name: 'instrumentId', description: '수정할 악기의 ID' })
  @ApiResponse({ status: 200, description: '악기 수정 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '악기를 찾을 수 없음' })
  async update(@Param('instrumentId') instrumentId: string, @Body() updateInstrumentDto: UpdateInstrumentDto, @Req() req: Request) {
    const { memberId } = req.user;
    return await this.instrumentService.update(memberId, +instrumentId, updateInstrumentDto);
  }

  @Delete(':instrumentId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '악기 삭제', description: '특정 악기를 삭제합니다.' })
  @ApiParam({ name: 'instrumentId', description: '삭제할 악기의 ID' })
  @ApiResponse({ status: 200, description: '악기 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '악기를 찾을 수 없음' })
  async remove(@Param('instrumentId') instrumentId: string, @Req() req: Request) {
    const { memberId } = req.user;
    return await this.instrumentService.remove(+memberId, +instrumentId);
  }
}
