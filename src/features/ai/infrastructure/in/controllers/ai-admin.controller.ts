import {
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAccessGuard } from 'src/security/presentation/guards/admin-access.guard';
import { AdminId } from 'src/security/presentation/decorators';
import { AiService } from '../../../application/ai.service';
import { GetAiContextQueryDto } from '../dto/request/get-ai-context.query.dto';
import { AiContextResDto } from '../dto/response/ai-context.res.dto';
import { AiUsageCheckResDto } from '../dto/response/ai-usage-check.res.dto';

@ApiTags('관리자 AI API')
@ApiBearerAuth()
@UseGuards(AdminAccessGuard)
@Controller('admin/ai')
export class AiAdminController {
  constructor(private readonly aiService: AiService) {}

  @Post('usage/check')
  @HttpCode(200)
  @ApiOperation({
    summary: 'AI usage 검증',
    description:
      '관리자 JWT로 인증된 요청. genAI 호출 직전 BFF 또는 클라이언트가 호출합니다.',
  })
  @ApiResponse({
    status: 200,
    description: 'usage 조회 성공',
    type: AiUsageCheckResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  checkUsage(@AdminId() adminId: number) {
    return this.aiService.checkUsage(String(adminId));
  }

  @Get('context')
  @ApiOperation({
    summary: 'AI 대화 컨텍스트 조회',
    description:
      'roomId 기준 완결된 turn 히스토리와 예약 스냅샷, 사용 가능한 mutation command 목록을 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '컨텍스트 조회 성공',
    type: AiContextResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  getContext(@AdminId() adminId: number, @Query() query: GetAiContextQueryDto) {
    return this.aiService.getContext(String(adminId), query.roomId, query.limit);
  }
}
