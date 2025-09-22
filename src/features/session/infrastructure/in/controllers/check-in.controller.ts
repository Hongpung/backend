import {
  Body,
  Controller,
  Get,
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
  ApiExtraModels,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBody,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  AttendSessionResDto,
  AttendSessionFailResDto,
  AttendSessionSuccessResDto,
  CheckInSessionCreatableResDto,
  CheckInSessionJoinableResDto,
  CheckInSessionStateResDto,
  CheckInSessionStartableResDto,
  CheckInSessionUnavailableResDto,
  StartSessionResDto,
  StartSessionCreatedResDto,
  StartSessionFailResDto,
  StartSessionStartedResDto,
} from './dto/response';
import { StartSessionReqDto } from './dto/request';
import {
  CheckInUseCasePort,
  type CheckInUseCasePort as ICheckInUseCasePort,
} from '../../../application/ports/in/check-in.use-case.port';
import { CheckInResponseMapper } from './mappers/check-in.response.mapper';

@ApiTags('체크인 API')
@ApiBearerAuth()
@Controller('check-in')
export class CheckInController {
  constructor(
    @Inject(CheckInUseCasePort)
    private readonly checkInService: ICheckInUseCasePort,
  ) {}

  @Get('check-possible')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '체크인 가능 여부 확인',
    description: '사용자의 체크인 가능 여부를 확인합니다.',
  })
  @ApiExtraModels(
    CheckInSessionCreatableResDto,
    CheckInSessionStartableResDto,
    CheckInSessionJoinableResDto,
    CheckInSessionUnavailableResDto,
  )
  @ApiOkResponse({
    description: '체크인 가능 여부 조회 성공',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(CheckInSessionCreatableResDto) },
        { $ref: getSchemaPath(CheckInSessionStartableResDto) },
        { $ref: getSchemaPath(CheckInSessionJoinableResDto) },
        { $ref: getSchemaPath(CheckInSessionUnavailableResDto) },
      ],
    },
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async loadSessionState(
    @Req() req: Request,
  ): Promise<CheckInSessionStateResDto> {
    const { memberId } = req.user;
    const result = this.checkInService.sessionStatus(+memberId);
    return CheckInResponseMapper.toSessionStateResDto(result);
  }

  @Post('start')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '세션 시작',
    description: '사용자의 세션을 시작합니다.',
  })
  @ApiBody({ type: StartSessionReqDto })
  @ApiExtraModels(
    StartSessionCreatedResDto,
    StartSessionStartedResDto,
    StartSessionFailResDto,
  )
  @ApiCreatedResponse({
    description: '세션 시작 성공/실패',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(StartSessionCreatedResDto) },
        { $ref: getSchemaPath(StartSessionStartedResDto) },
        { $ref: getSchemaPath(StartSessionFailResDto) },
      ],
    },
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async startSession(
    @Req() req: Request,
    @Body() body: StartSessionReqDto,
  ): Promise<StartSessionResDto> {
    const { memberId } = req.user;
    return this.checkInService.tryStartSession(
      +memberId,
      body.participationAvailable,
    );
  }

  @Post('attend')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '세션 참여',
    description: '사용자가 세션에 참여합니다.',
  })
  @ApiExtraModels(AttendSessionSuccessResDto, AttendSessionFailResDto)
  @ApiCreatedResponse({
    description: '세션 참여 성공/실패',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(AttendSessionSuccessResDto) },
        { $ref: getSchemaPath(AttendSessionFailResDto) },
      ],
    },
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async attendSession(@Req() req: Request): Promise<AttendSessionResDto> {
    const { memberId } = req.user;
    return this.checkInService.attendToSession(+memberId);
  }
}
