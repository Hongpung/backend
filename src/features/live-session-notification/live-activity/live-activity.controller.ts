import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Body,
  Inject,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  LiveActivityUseCasePort,
  type LiveActivityUseCasePort as ILiveActivityUseCasePort,
} from './application/ports/in/live-activity.use-case.port';
import {
  RegisterLiveActivityDto,
  UpdateLiveActivityDto,
} from './dto/live-activity.dto';
import { LiveActivityMessageResDto } from './dto/live-activity-message.res.dto';
import { LiveActivityMyResDto } from './dto/live-activity-my.res.dto';
import { UserAccessGuard } from 'src/security/presentation/guards/user-access.guard';
import { MemberId } from 'src/security/presentation/decorators';

@ApiTags('Live Activity API')
@ApiBearerAuth()
@Controller('live-activity')
export class LiveActivityController {
  constructor(
    @Inject(LiveActivityUseCasePort)
    private readonly liveActivityUseCase: ILiveActivityUseCasePort,
  ) {}

  @Post('register')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: 'Live Activity 등록',
    description: '세션에 대한 Live Activity를 등록합니다.',
  })
  @ApiBody({ type: RegisterLiveActivityDto })
  @ApiResponse({
    status: 201,
    description: 'Live Activity 등록 성공',
    type: LiveActivityMessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async registerLiveActivity(
    @Body() dto: RegisterLiveActivityDto,
    @MemberId() memberId: number,
  ): Promise<{ message: string }> {
    await this.liveActivityUseCase.registerLiveActivity(memberId, dto);
    return { message: 'Live Activity 등록 성공' };
  }

  @Patch('update')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: 'Live Activity 업데이트',
    description: 'Live Activity 상태를 업데이트합니다.',
  })
  @ApiBody({ type: UpdateLiveActivityDto })
  @ApiResponse({
    status: 200,
    description: 'Live Activity 업데이트 성공',
    type: LiveActivityMessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async updateLiveActivity(
    @Body() dto: UpdateLiveActivityDto,
    @MemberId() memberId: number,
  ): Promise<{ message: string }> {
    await this.liveActivityUseCase.updateLiveActivity(memberId, dto);
    return { message: 'Live Activity 업데이트 성공' };
  }

  @Delete(':sessionId')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: 'Live Activity 종료',
    description: 'Live Activity를 종료합니다.',
  })
  @ApiParam({ name: 'sessionId', description: '세션 ID' })
  @ApiResponse({
    status: 200,
    description: 'Live Activity 종료 성공',
    type: LiveActivityMessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async endLiveActivity(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @MemberId() memberId: number,
  ): Promise<{ message: string }> {
    await this.liveActivityUseCase.endLiveActivity(memberId, sessionId);
    return { message: 'Live Activity 종료 성공' };
  }

  @Get('my')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '내 활성 Live Activity 조회',
    description: '내가 활성화한 Live Activity 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: 'Live Activity 목록 조회 성공',
    type: LiveActivityMyResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getMyLiveActivities(
    @MemberId() memberId: number,
  ): Promise<{ sessionIds: Array<number | string> }> {
    const sessionIds =
      await this.liveActivityUseCase.getActiveLiveActivities(memberId);
    return { sessionIds };
  }
}
