import type {
  AiContextSnapshot,
  AiDraftRecord,
  AiTurnRecord,
  AiUsageSnapshot,
  CreateDraftInput,
  CreateDraftResult,
  ResolveDraftInput,
  ResolveDraftResult,
  SaveTurnsInput,
  SaveTurnsPersistenceResult,
  SaveTurnsResult,
} from '../../../domain/ai.types';

export const AiStorePort = Symbol('AiStorePort');

export interface AiStorePort {
  countUsageEligibleUserTurns(adminId: string, monthStart: Date): Promise<number>;

  findRecentTurns(
    adminId: string,
    roomId: string,
    limit: number,
  ): Promise<AiTurnRecord[]>;

  createDraft(input: CreateDraftInput): Promise<CreateDraftResult>;

  findDraft(
    adminId: string,
    roomId: string,
    draftId: string,
  ): Promise<AiDraftRecord | null>;

  resolveDraft(
    input: ResolveDraftInput,
    executionResult: unknown | undefined,
    turnsToPersist: Array<{
      role: 'user' | 'assistant';
      content: Record<string, unknown>[];
      countsForUsage: boolean;
    }>,
  ): Promise<ResolveDraftResult>;

  saveTurns(input: SaveTurnsInput): Promise<SaveTurnsPersistenceResult>;
}

export const AiContextPort = Symbol('AiContextPort');

export interface AiContextPort {
  buildContext(
    adminId: string,
    roomId: string,
    limit: number,
  ): Promise<AiContextSnapshot>;
}

export const AiUsagePort = Symbol('AiUsagePort');

export interface AiUsagePort {
  checkUsage(adminId: string): Promise<AiUsageSnapshot>;
}

export const AiToolExecutorPort = Symbol('AiToolExecutorPort');

export interface AiToolExecutorPort {
  execute(
    adminId: string,
    toolName: string,
    args: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<unknown>;
}
