import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UserAccessGuard } from 'src/security/presentation/guards/user-access.guard';
import { MemberId } from 'src/security/presentation/decorators';
import {
  NotificationUseCasePort,
  type NotificationUseCasePort as INotificationUseCasePort,
} from '../../../application/ports/in/notification.use-case.port';
import { SendNotificationDto } from '../dto/request/send-notification.dto';
import { NotificationListResponseDto } from '../dto/response/notification-list-response.dto';
import { NotReadStatusResponseDto } from '../dto/response/not-read-status-response.dto';
import { MessageResponseDto } from '../dto/response/message-response.dto';
import { NotificationResponseMapper } from './mappers/notification.response.mapper';

@ApiTags('알림 API')
@ApiBearerAuth()
@Controller('notification')
export class NotificationController {
  constructor(
    @Inject(NotificationUseCasePort)
    private readonly notificationUseCase: INotificationUseCasePort,
  ) {}

  @Post('send')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '알림 생성',
    description: '새로운 알림을 생성합니다.',
  })
  @ApiBody({ type: SendNotificationDto })
  @ApiResponse({ status: 201, description: '알림 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async sendSomeUser(@Body() sendNotificationDto: SendNotificationDto) {
    await this.notificationUseCase.sendPushNotifications({
      to: sendNotificationDto.to,
      title: sendNotificationDto.title,
      body: sendNotificationDto.text,
    });
  }

  @Get('my')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '알림 목록 조회',
    description: '사용자의 모든 알림 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '알림 목록 조회 성공',
    type: NotificationListResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getNotifications(
    @MemberId() memberId: number,
  ): Promise<NotificationListResponseDto> {
    const notificationEntities =
      await this.notificationUseCase.getUserNotifications(memberId);
    const notifications =
      NotificationResponseMapper.entityArrayToResponseDtoArray(
        notificationEntities,
      );
    return { notifications };
  }

  @Get('notRead')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '알림 읽지 않은 상태 조회',
    description: '사용자의 알림 읽지 않은 상태를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '알림 읽지 않은 상태 조회 성공',
    type: NotReadStatusResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getNotreadStatus(
    @MemberId() memberId: number,
  ): Promise<NotReadStatusResponseDto> {
    return await this.notificationUseCase.getNotreadStatus(memberId);
  }

  @Post('read')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '알림 읽음 처리',
    description: '사용자의 모든 알림을 읽음 처리합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '알림 읽음 처리 성공',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async userReadNotifications(
    @MemberId() memberId: number,
  ): Promise<MessageResponseDto> {
    return await this.notificationUseCase.userReadNotifications(memberId);
  }

  @Delete('delete/all')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '알림 전체 삭제',
    description: '사용자의 모든 알림을 삭제합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '알림 전체 삭제 성공',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async deleteAllNotifications(
    @MemberId() memberId: number,
  ): Promise<MessageResponseDto> {
    return await this.notificationUseCase.deleteAllNotifications(memberId);
  }

  @Delete('delete/:notificationId')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '알림 삭제',
    description: '특정 알림을 삭제합니다.',
  })
  @ApiParam({ name: 'notificationId', description: '삭제할 알림의 ID' })
  @ApiResponse({
    status: 200,
    description: '알림 삭제 성공',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '알림을 찾을 수 없음' })
  async deleteNotification(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @MemberId() memberId: number,
  ): Promise<MessageResponseDto> {
    return await this.notificationUseCase.deleteNotification(
      notificationId,
      memberId,
    );
  }
}
