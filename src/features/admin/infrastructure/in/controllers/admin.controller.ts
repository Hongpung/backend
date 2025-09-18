import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  Inject,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminUseCasePort } from '../../../application/ports/in/admin.use-case.port';
import { AdminAccessGuard } from 'src/security/presentation/guards/admin-access.guard';
import { CreateAdminReqDto } from '../dto/request/create-admin.req.dto';
import { ChangeAdminReqDto } from '../dto/request/change-admin.req.dto';
import { AdminListResDto } from '../dto/response/admin-list.res.dto';
import { CreateAdminResDto } from '../dto/response/create-admin.res.dto';
import { ChangeAdminResDto } from '../dto/response/change-admin.res.dto';
import { DeleteAdminResDto } from '../dto/response/delete-admin.res.dto';
import { AdminResponseMapper } from './mappers/admin.response.mapper';
import { AdminControllerRequestMapper } from './mappers/admin-controller.request.mapper';

@ApiTags('관리자 API')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AdminAccessGuard)
export class AdminController {
  constructor(
    @Inject(AdminUseCasePort)
    private readonly adminUseCase: AdminUseCasePort,
  ) {}

  @Get()
  @ApiOperation({
    summary: '관리자 목록 조회',
    description: '모든 관리자의 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '관리자 목록 조회 성공',
    type: AdminListResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getAdmins(): Promise<AdminListResDto> {
    const entities = await this.adminUseCase.getAdmins();
    return AdminResponseMapper.toListDto(entities);
  }

  @Post(':memberId')
  @ApiOperation({
    summary: '관리자 권한 부여',
    description: '일반 유저에게 관리자 권한을 부여합니다.',
  })
  @ApiParam({
    name: 'memberId',
    description: '권한을 부여할 유저의 ID',
    type: Number,
  })
  @ApiResponse({
    status: 201,
    description: '관리자 권한 부여 성공',
    type: CreateAdminResDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (본인에게 부여 시도, 이미 관리자 등)',
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '유저를 찾을 수 없음' })
  async createAdmin(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: CreateAdminReqDto,
    @Req() req: Request,
  ): Promise<CreateAdminResDto> {
    const { adminId } = req.admin as { adminId: number };
    const result = await this.adminUseCase.createAdmin(
      adminId,
      memberId,
      AdminControllerRequestMapper.toAdminLevelFromCreate(dto),
    );
    return AdminResponseMapper.toCreateDto(result.message, result.admin);
  }

  @Patch('change/:memberId')
  @ApiOperation({
    summary: '관리자 권한 변경',
    description: '특정 관리자의 권한 레벨을 변경합니다.',
  })
  @ApiParam({
    name: 'memberId',
    description: '변경할 관리자의 ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '관리자 권한 변경 성공',
    type: ChangeAdminResDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (자신의 권한 변경 시도 등)',
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '관리자를 찾을 수 없음' })
  async changeAdminLevel(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: ChangeAdminReqDto,
    @Req() req: Request,
  ): Promise<ChangeAdminResDto> {
    const { adminId } = req.admin as { adminId: number };
    const result = await this.adminUseCase.changeAdminLevel(
      adminId,
      memberId,
      AdminControllerRequestMapper.toAdminLevelFromChange(dto),
    );
    return AdminResponseMapper.toChangeDto(result.message, result.admin);
  }

  @Patch('delete/:memberId')
  @ApiOperation({
    summary: '관리자 권한 삭제',
    description: '특정 관리자의 권한을 삭제합니다.',
  })
  @ApiParam({
    name: 'memberId',
    description: '권한을 삭제할 관리자의 ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '관리자 권한 삭제 성공',
    type: DeleteAdminResDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (자신의 권한 삭제 시도 등)',
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '관리자를 찾을 수 없음' })
  async deleteAdminLevel(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Req() req: Request,
  ): Promise<DeleteAdminResDto> {
    const { adminId } = req.admin as { adminId: number };
    const result = await this.adminUseCase.deleteAdminLevel(adminId, memberId);
    return AdminResponseMapper.toDeleteDto(result.message, result.admin);
  }
}
