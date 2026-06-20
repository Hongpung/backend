export type AiMessageRole = 'user' | 'assistant';

export type AiContentBlock = Record<string, unknown>;

export interface AiTurnMessage {
  role: AiMessageRole;
  content: AiContentBlock[];
}

export type AiDraftStatus = 'PENDING' | 'EXECUTED' | 'REJECTED';

export interface AiDraftRecord {
  draftId: string;
  adminId: string;
  roomId: string;
  toolUseId: string;
  toolName: string;
  args: Record<string, unknown>;
  pendingAssistantContent: AiContentBlock[];
  pendingUserMessage: string;
  status: AiDraftStatus;
  createdAt: Date;
  expiresAt: Date;
  resolvedAt?: Date;
  result?: unknown;
  idempotencyKey: string;
}

export interface AiTurnRecord {
  turnId: string;
  adminId: string;
  roomId: string;
  role: AiMessageRole;
  content: AiContentBlock[];
  createdAt: Date;
  /** POST /internal/ai/turns 경로로 저장된 user turn만 usage 집계 대상 */
  countsForUsage: boolean;
}

export interface AiUsageSnapshot {
  allowed: boolean;
  used: number;
  limit: number;
  period: 'month';
  resetAt: string;
}

export interface AiContextReservationSnapshot {
  id: string;
  status: string;
  date: string;
  spaceName: string;
}

export interface AiAvailableCommand {
  name: string;
  description: string;
}

export interface AiContextSnapshot {
  messages: AiTurnMessage[];
  domainSnapshot: {
    reservations: AiContextReservationSnapshot[];
    availableCommands: AiAvailableCommand[];
  };
}

export interface CreateDraftInput {
  adminId: string;
  roomId: string;
  toolUseId: string;
  toolName: string;
  args: Record<string, unknown>;
  pendingAssistantContent: AiContentBlock[];
  pendingUserMessage: string;
}

export interface CreateDraftResult {
  draftId: string;
  status: 'PENDING';
  createdAt: string;
  expiresAt: string;
}

export interface ResolveDraftInput {
  adminId: string;
  roomId: string;
  draftId: string;
  decision: 'approve' | 'reject';
  editedArgs?: Record<string, unknown>;
}

export interface ResolveDraftResult {
  draftId: string;
  status: 'EXECUTED' | 'REJECTED';
  result?: unknown;
  resolvedAt: string;
}

export interface SaveTurnsInput {
  adminId: string;
  roomId: string;
  turns: AiTurnMessage[];
}

export interface SaveTurnsPersistenceResult {
  ok: true;
  turnIds: string[];
}

export interface SaveTurnsResult extends SaveTurnsPersistenceResult {
  usage: AiUsageSnapshot;
}
