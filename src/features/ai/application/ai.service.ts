import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateDraftInput,
  CreateDraftResult,
  ResolveDraftInput,
  ResolveDraftResult,
  SaveTurnsInput,
  SaveTurnsResult,
} from '../domain/ai.types';
import {
  AiStorePort,
  AiToolExecutorPort,
  type AiStorePort as IAiStorePort,
  type AiToolExecutorPort as IAiToolExecutorPort,
} from './ports/out/ai.ports';
import {
  toToolResultContent,
  toUserTextContent,
} from './utils/ai-turn-context.util';
import { AiContextService } from './services/ai-context.service';
import { AiUsageService } from './services/ai-usage.service';

@Injectable()
export class AiService {
  constructor(
    private readonly aiUsageService: AiUsageService,
    private readonly aiContextService: AiContextService,
    @Inject(AiStorePort)
    private readonly aiStore: IAiStorePort,
    @Inject(AiToolExecutorPort)
    private readonly aiToolExecutor: IAiToolExecutorPort,
  ) {}

  checkUsage(adminId: string) {
    return this.aiUsageService.checkUsage(adminId);
  }

  getContext(adminId: string, roomId: string, limit?: number) {
    return this.aiContextService.buildContext(adminId, roomId, limit);
  }

  createDraft(input: CreateDraftInput): Promise<CreateDraftResult> {
    return this.aiStore.createDraft(input);
  }

  async resolveDraft(input: ResolveDraftInput): Promise<ResolveDraftResult> {
    const draft = await this.aiStore.findDraft(
      input.adminId,
      input.roomId,
      input.draftId,
    );
    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    if (draft.status !== 'PENDING') {
      throw new ConflictException({
        error: 'ALREADY_RESOLVED',
        status: draft.status,
      });
    }

    if (draft.adminId !== input.adminId) {
      throw new ForbiddenException('Draft admin mismatch');
    }

    if (draft.roomId !== input.roomId) {
      throw new ForbiddenException('Draft room mismatch');
    }

    const args = input.editedArgs ?? draft.args;
    let executionResult: unknown;

    if (input.decision === 'approve') {
      executionResult = await this.aiToolExecutor.execute(
        input.adminId,
        draft.toolName,
        args,
        draft.idempotencyKey,
      );
    }

    const turnsToPersist =
      input.decision === 'approve'
        ? [
            {
              role: 'user' as const,
              content: toUserTextContent(draft.pendingUserMessage),
              countsForUsage: false,
            },
            {
              role: 'assistant' as const,
              content: draft.pendingAssistantContent,
              countsForUsage: false,
            },
            {
              role: 'user' as const,
              content: toToolResultContent(draft.toolUseId, executionResult),
              countsForUsage: false,
            },
          ]
        : [
            {
              role: 'user' as const,
              content: toUserTextContent(draft.pendingUserMessage),
              countsForUsage: false,
            },
            {
              role: 'assistant' as const,
              content: draft.pendingAssistantContent,
              countsForUsage: false,
            },
          ];

    return this.aiStore.resolveDraft(input, executionResult, turnsToPersist);
  }

  async saveTurns(input: SaveTurnsInput): Promise<SaveTurnsResult> {
    const saved = await this.aiStore.saveTurns(input);
    const usage = await this.aiUsageService.checkUsage(input.adminId);

    return {
      ...saved,
      usage,
    };
  }
}
