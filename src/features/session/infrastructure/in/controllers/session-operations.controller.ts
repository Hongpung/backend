import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Req,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { UserAccessGuard } from 'src/security/presentation/guards/user-access.guard';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  EndSessionFailResDto,
  EndSessionResDto,
  EndSessionSuccessResDto,
  IsCheckinResDto,
  SessionOperationResultResDto,
  SessionOperationSuccessResDto,
  SessionOperationFailResDto,
} from './dto/response';
import { EndSessionReqDto, ExtendSessionReqDto } from './dto/request';
import { SessionOperationsResponseMapper } from './mappers/session-operations.response.mapper';
import {
  SessionOperationsUseCasePort,
  type SessionOperationsUseCasePort as ISessionOperationsUseCasePort,
} from '../../../application/ports/in/session-operations.use-case.port';
@ApiTags('세션 운영 API')
@ApiBearerAuth()
@Controller('session')
@UseGuards(UserAccessGuard)
export class SessionOperationController {
  private readonly logger = new Logger(SessionOperationController.name);

  constructor(
    @Inject(SessionOperationsUseCasePort)
    private readonly sessionOperations: ISessionOperationsUseCasePort,
  ) {}

  @Get('is-checkin')
  @ApiOperation({
    summary: '체크인 상태 확인',
    description: '사용자의 체크인 상태를 확인합니다.',
  })
  @ApiOkResponse({
    description: '체크인 상태 조회 성공',
    type: IsCheckinResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async isCheckin(@Req() req: Request): Promise<IsCheckinResDto> {
    const { memberId } = req.user;
    const result = this.sessionOperations.isCheckinUser(+memberId);
    return SessionOperationsResponseMapper.toIsCheckinResDto(result);
  }

  @Post('extend')
  @ApiOperation({
    summary: '세션 연장',
    description:
      '지정한 런타임 세션 ID의 연습을 연장합니다. sessionId 생략 시 현재 ONAIR 세션을 사용합니다.',
  })
  @ApiBody({ type: ExtendSessionReqDto, required: false })
  @ApiExtraModels(SessionOperationSuccessResDto, SessionOperationFailResDto)
  @ApiOkResponse({
    description: '세션 연장 성공/실패',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(SessionOperationSuccessResDto) },
        { $ref: getSchemaPath(SessionOperationFailResDto) },
      ],
    },
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getSessionInfo(
    @Body() body: ExtendSessionReqDto = {},
    @Req() req: Request,
  ): Promise<SessionOperationResultResDto> {
    const { memberId } = req.user;
    const result = await this.sessionOperations.extendSession(
      +memberId,
      body.sessionId,
    );
    return SessionOperationsResponseMapper.toExtendSessionResDto(result);
  }

  @Post('end')
  @ApiOperation({
    summary: '세션 종료',
    description:
      '사용자의 세션을 종료합니다. sessionId 생략 시 현재 ONAIR 세션을 사용합니다.',
  })
  @ApiBody({ type: EndSessionReqDto })
  @ApiExtraModels(EndSessionSuccessResDto, EndSessionFailResDto)
  @ApiOkResponse({
    description: '세션 종료 성공/실패',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(EndSessionSuccessResDto) },
        { $ref: getSchemaPath(EndSessionFailResDto) },
      ],
    },
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getSpecificSessionInfo(
    @Body() body: EndSessionReqDto,
    @Req() req: Request,
  ): Promise<EndSessionResDto> {
    const { memberId } = req.user;
    const result = await this.sessionOperations.endSession(
      +memberId,
      body.sessionId,
      body.returnImageUrls,
    );

    this.logger.debug(
      `POST /session/end memberId=${memberId} message=${result.message}`,
    );

    return SessionOperationsResponseMapper.toEndSessionResDto(result);
  }
}
