import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BffServiceAuthGuard } from 'src/security/presentation/guards/bff-service-auth.guard';
import { AiService } from '../../../application/ai.service';
import { CreateAiDraftReqDto } from '../dto/request/create-ai-draft.req.dto';
import { ResolveAiDraftReqDto } from '../dto/request/resolve-ai-draft.req.dto';
import { SaveAiTurnsReqDto } from '../dto/request/save-ai-turns.req.dto';
import { CreateAiDraftResDto } from '../dto/response/create-ai-draft.res.dto';
import {
  ResolveAiDraftConflictResDto,
  ResolveAiDraftResDto,
} from '../dto/response/resolve-ai-draft.res.dto';
import { SaveAiTurnsResDto } from '../dto/response/save-ai-turns.res.dto';

@ApiTags('Internal AI API (BFF)')
@ApiHeader({
  name: 'x-bff-sdk-key',
  description: 'BFF ↔ main 서버 공유 SDK 키. 사용자 JWT 만료 후에도 대화 기록 저장용.',
  required: true,
})
@UseGuards(BffServiceAuthGuard)
@Controller('internal/ai')
export class AiInternalController {
  constructor(private readonly aiService: AiService) {}

  @Post('drafts')
  @HttpCode(201)
  @ApiOperation({
    summary: 'mutation draft 저장',
    description:
      'genAI 응답에 mutation tool_use가 있을 때 BFF가 호출합니다. Admin JWT 없이 SDK 키만 검증합니다.',
  })
  @ApiBody({ type: CreateAiDraftReqDto })
  @ApiResponse({
    status: 201,
    description: 'draft 생성 성공',
    type: CreateAiDraftResDto,
  })
  @ApiResponse({ status: 401, description: 'SDK 키 없음 또는 불일치' })
  createDraft(@Body() body: CreateAiDraftReqDto) {
    return this.aiService.createDraft(body);
  }

  @Post('drafts/:draftId/resolve')
  @ApiOperation({
    summary: 'draft approve/reject',
    description:
      'BFF가 사용자 쿠키를 재검증한 뒤 호출합니다. approve 시 도메인 액션 실행 후 turn 저장까지 처리합니다.',
  })
  @ApiParam({ name: 'draftId', description: 'draft UUID' })
  @ApiBody({ type: ResolveAiDraftReqDto })
  @ApiResponse({
    status: 200,
    description: 'resolve 성공',
    type: ResolveAiDraftResDto,
  })
  @ApiResponse({
    status: 409,
    description: '이미 처리된 draft',
    type: ResolveAiDraftConflictResDto,
  })
  @ApiResponse({ status: 401, description: 'SDK 키 없음 또는 불일치' })
  resolveDraft(
    @Param('draftId') draftId: string,
    @Body() body: ResolveAiDraftReqDto,
  ) {
    return this.aiService.resolveDraft({ ...body, draftId });
  }

  @Post('turns')
  @HttpCode(201)
  @ApiOperation({
    summary: 'read-only turn 저장',
    description:
      'mutation 없는 순수 응답 턴 저장. user turn은 countsForUsage=true로 저장되며, 응답 usage에 반영됩니다.',
  })
  @ApiBody({ type: SaveAiTurnsReqDto })
  @ApiResponse({
    status: 201,
    description: 'turn 저장 성공',
    type: SaveAiTurnsResDto,
  })
  @ApiResponse({ status: 401, description: 'SDK 키 없음 또는 불일치' })
  saveTurns(@Body() body: SaveAiTurnsReqDto) {
    return this.aiService.saveTurns(body);
  }
}
