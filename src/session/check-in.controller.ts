import { Body, Controller, Get, HttpException, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import { Request } from 'express';
import { CheckInService } from './check-in.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('체크인 API')
@ApiBearerAuth()
@Controller('check-in')
export class CheckInController {
    constructor(
        private readonly checkInService: CheckInService
    ) { }

    @Get('check-possible')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '체크인 가능 여부 확인', description: '사용자의 체크인 가능 여부를 확인합니다.' })
    @ApiResponse({ status: 200, description: '체크인 가능 여부 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async loadSessionState(@Req() req: Request) {
        const { memberId } = req.user;
        return this.checkInService.sessionStatus(+memberId)
    }

    @Post('start')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '세션 시작', description: '사용자의 세션을 시작합니다.' })
    @ApiResponse({ status: 201, description: '세션 시작 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async startSession(@Req() req: Request, @Body() body: { participationAvailable?: boolean }) {
        const { memberId } = req.user
        console.log(body)
        try {
            return this.checkInService.tryStartSession(+memberId, body.participationAvailable)
        }
        catch (e) {
            return HttpException;
        }
    }

    @Post('attend')
    @ApiOperation({ summary: '세션 참여', description: '사용자가 세션에 참여합니다.' })
    @ApiResponse({ status: 201, description: '세션 참여 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async attendSession(@Req() req: Request) {
        const { memberId } = req.user;
        return this.checkInService.attendToSession(+memberId)
    }
}
