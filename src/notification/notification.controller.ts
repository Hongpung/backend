import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('알림 API')
@ApiBearerAuth()
@Controller('notification')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    // @Get()
    // async sendAllUser() {
    //     await this.notificationService.sendPushNotifications({
    //         title: 'Test',
    //         body: '중간문구',
    //     });
    // }

    @Post('send')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '알림 생성', description: '새로운 알림을 생성합니다.' })
    @ApiResponse({ status: 201, description: '알림 생성 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async sendSomeUser(@Body() sendForm: { to: number[], title: string, text: string }) {
        console.log(sendForm)
        await this.notificationService.sendPushNotifications({
            to: sendForm.to,
            title: sendForm.title,
            body: sendForm.text,
        });
    }


    @Get('my')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '알림 목록 조회', description: '사용자의 모든 알림 목록을 조회합니다.' })
    @ApiResponse({ status: 200, description: '알림 목록 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async getNotifications(@Req() req: Request) {
        const { memberId } = req.user;
        const notifications = await this.notificationService.getUserNotifications(+memberId);
        console.log(notifications)
        return notifications
    }

    @Get('notRead')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '알림 읽지 않은 상태 조회', description: '사용자의 알림 읽지 않은 상태를 조회합니다.' })
    @ApiResponse({ status: 200, description: '알림 읽지 않은 상태 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async getNotreadStatus(@Req() req: Request) {
        const { memberId } = req.user;
        return await this.notificationService.getNotreadStatus(+memberId);
    }

    @Post('read')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '알림 읽음 처리', description: '사용자의 모든 알림을 읽음 처리합니다.' })
    @ApiResponse({ status: 200, description: '알림 읽음 처리 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async userReadNotifications(@Req() req: Request) {
        const { memberId } = req.user;
        console.log('user Read All')
        await this.notificationService.userReadNotifications(+memberId);
    }


    @Delete('delete/all')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '알림 전체 삭제', description: '사용자의 모든 알림을 삭제합니다.' })
    @ApiResponse({ status: 200, description: '알림 전체 삭제 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async deleteAllNotifications(@Req() req: Request) {
        const { memberId } = req.user;
        return await this.notificationService.deleteAllNotifications(+memberId);
    }

    @Delete('delete/:notificationId')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '알림 삭제', description: '특정 알림을 삭제합니다.' })
    @ApiParam({ name: 'notificationId', description: '삭제할 알림의 ID' })
    @ApiResponse({ status: 200, description: '알림 삭제 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 404, description: '알림을 찾을 수 없음' })
    async deleteNotification(@Param('notificationId') notificationId: number, @Req() req: Request) {
        const { memberId } = req.user;
        return await this.notificationService.deleteNotification(+notificationId, +memberId);
    }

}
