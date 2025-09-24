import { Controller, Post, Body, Inject, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import {
  LiveNotificationUseCasePort,
  type LiveNotificationUseCasePort as ILiveNotificationUseCasePort,
} from './application/ports/in/live-notification.use-case.port';
import {
  RegisterLiveNotificationDto,
  SendLiveNotificationDto,
} from './dto/live-notification.dto';
import { LiveNotificationMessageResDto } from './dto/live-notification-message.res.dto';
import { UserAccessGuard } from 'src/security/presentation/guards/user-access.guard';
import { MemberId } from 'src/security/presentation/decorators';

@ApiTags('Live Notification API')
@ApiBearerAuth()
@Controller('live-notification')
export class LiveNotificationController {
  constructor(
    @Inject(LiveNotificationUseCasePort)
    private readonly liveNotificationUseCase: ILiveNotificationUseCasePort,
  ) {}

  @Post('register')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: 'Live Notification 등록',
    description:
      '세션에 대한 Live Notification을 등록합니다. Prisma에서 notificationToken을 조회하여 Redis에 저장합니다.',
  })
  @ApiBody({ type: RegisterLiveNotificationDto })
  @ApiResponse({
    status: 201,
    description: 'Live Notification 등록 성공',
    type: LiveNotificationMessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async registerLiveNotification(
    @Body() dto: RegisterLiveNotificationDto,
    @MemberId() memberId: number,
  ): Promise<{ message: string }> {
    await this.liveNotificationUseCase.registerLiveNotification(dto, memberId);
    return { message: 'Live Notification 등록 성공' };
  }

  @Post('send')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: 'Live Notification 전송',
    description:
      'Live Notification을 Expo로 전송합니다. Redis에서 세션의 토큰 목록을 조회하여 전송합니다.',
  })
  @ApiBody({ type: SendLiveNotificationDto })
  @ApiResponse({
    status: 201,
    description: 'Live Notification 전송 성공',
    type: LiveNotificationMessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async sendLiveNotification(
    @Body() dto: SendLiveNotificationDto,
  ): Promise<{ message: string }> {
    await this.liveNotificationUseCase.sendLiveNotification(dto);
    return { message: 'Live Notification 전송 완료' };
  }
}
