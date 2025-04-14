import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import { Request } from 'express';
import { SessionOperationsService } from './session-operations.service';
import { AdminGuard } from 'src/guards/admin.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('세션 운영 API')
@ApiBearerAuth()
@Controller('session')
@UseGuards(AuthGuard)
export class SessionOperationController {
    constructor(
        private readonly sessionOperations: SessionOperationsService
    ) { }

    @Get('is-checkin')
    @ApiOperation({ summary: '체크인 상태 확인', description: '사용자의 체크인 상태를 확인합니다.' })
    @ApiResponse({ status: 200, description: '체크인 상태 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async isCheckin(@Req() req: Request) {
        const { memberId } = req.user;
        return this.sessionOperations.isCheckinUser(+memberId)
    }

    @Post('extend')
    @ApiOperation({ summary: '세션 연장', description: '사용자의 세션을 연장합니다.' })
    @ApiResponse({ status: 200, description: '세션 연장 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async getSessionInfo(@Req() req: Request) {
        const { memberId } = req.user;
        return await this.sessionOperations.extendSession(+memberId)
    }

    @Post('end')
    @ApiOperation({ summary: '세션 종료', description: '사용자의 세션을 종료합니다.' })
    @ApiResponse({ status: 200, description: '세션 종료 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async getSpecificSessionInfo(@Body() body: { returnImageUrls: string[] }, @Req() req: Request) {
        const { memberId } = req.user;
        return this.sessionOperations.endSession(+memberId, body.returnImageUrls)
    }
}
