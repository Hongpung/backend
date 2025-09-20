import {
  Controller,
  Body,
  Patch,
  Delete,
  UseGuards,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserAccessGuard } from 'src/security/presentation/guards/user-access.guard';
import { MemberId } from 'src/security/presentation/decorators';
import {
  PushNotificationTokenUseCasePort,
  type PushNotificationTokenUseCasePort as IPushNotificationTokenUseCasePort,
} from '../../../application/ports/in/push-notification-token.use-case.port';
import { UpdateNotificationTokenReqDto } from '../dto/request/update-notification-token.req.dto';
import { MessageResponseDto } from '../dto/response/message-response.dto';
import { PushNotificationTokenRequestMapper } from './mappers/push-notification-token.request.mapper';

/**
 * 기존 클라이언트 경로 유지: PATCH/DELETE /member/NToken
 * ownership은 push-notification feature.
 */
@ApiTags('회원 API')
@ApiBearerAuth()
@Controller('member')
export class PushNotificationTokenController {
  constructor(
    @Inject(PushNotificationTokenUseCasePort)
    private readonly pushNotificationTokenUseCase: IPushNotificationTokenUseCasePort,
  ) {}

  @Patch('NToken')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '알림 토큰 업데이트',
    description:
      '푸시 알림 수신을 위한 디바이스 토큰(Expo)을 등록하거나 업데이트합니다.',
  })
  @ApiBody({ type: UpdateNotificationTokenReqDto })
  @ApiResponse({
    status: 200,
    description: '알림 토큰 등록 성공',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: '유효하지 않은 토큰 형식' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async updateNotificationToken(
    @Body() dto: UpdateNotificationTokenReqDto,
    @MemberId() memberId: number,
  ) {
    const params = PushNotificationTokenRequestMapper.toUpdateParams(dto);
    return this.pushNotificationTokenUseCase.updatePushNotificationToken(
      memberId,
      params,
    );
  }

  @Delete('NToken')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '알림 토큰 삭제',
    description:
      '등록된 푸시 알림 토큰을 삭제합니다. 디바이스 변경 또는 알림 수신 중단 시 사용합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '알림 토큰 삭제 성공',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async clearNotificationToken(@MemberId() memberId: number) {
    return this.pushNotificationTokenUseCase.clearPushNotificationToken(
      memberId,
    );
  }
}
