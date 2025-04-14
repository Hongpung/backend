import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ChangeAdminDto } from './dto/change-admin.dto';
import { AdminGuard } from 'src/guards/admin.guard';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('관리자 API')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get()
  @ApiOperation({ summary: '관리자 목록 조회', description: '모든 관리자의 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '관리자 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getAdmins() {
    return await this.adminService.getAdmins();
  }

  @Patch('change/:memberId')
  @ApiOperation({ summary: '관리자 권한 변경', description: '특정 관리자의 권한 레벨을 변경합니다.' })
  @ApiParam({ name: 'memberId', description: '변경할 관리자의 ID' })
  @ApiResponse({ status: 200, description: '관리자 권한 변경 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 (자신의 권한 변경 시도 등)' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '관리자를 찾을 수 없음' })
  async changeAdminLevel(@Param('memberId') memberId: number, @Body() changeAdminDto: ChangeAdminDto, @Req() req: Request) {
    const { adminId } = req.admin;
    return await this.adminService.chageAdminLevel(adminId, memberId, changeAdminDto);
  }

  @Patch('delete/:memberId')
  @ApiOperation({ summary: '관리자 권한 삭제', description: '특정 관리자의 권한을 삭제합니다.' })
  @ApiParam({ name: 'memberId', description: '권한을 삭제할 관리자의 ID' })
  @ApiResponse({ status: 200, description: '관리자 권한 삭제 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 (자신의 권한 삭제 시도 등)' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '관리자를 찾을 수 없음' })
  async deleteAdminLevel(@Param('memberId') memberId: number, @Req() req: Request) {
    const { adminId } = req.admin;
    return await this.adminService.deleteAdminLevel(adminId, memberId);
  }
}
