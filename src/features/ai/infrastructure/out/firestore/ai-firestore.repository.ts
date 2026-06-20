import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { randomUUID } from 'crypto';
import { stripUndefinedForFirestore } from 'src/features/session/infrastructure/out/cache/session-snapshot-datetime.util';
import type {
  AiDraftRecord,
  AiDraftStatus,
  AiTurnRecord,
  CreateDraftInput,
  CreateDraftResult,
  ResolveDraftInput,
  ResolveDraftResult,
  SaveTurnsInput,
  SaveTurnsPersistenceResult,
} from '../../../domain/ai.types';
import { AiStorePort } from '../../../application/ports/out/ai.ports';

type FirestoreTimestamp = admin.firestore.Timestamp;

interface FirestoreTurnDoc {
  adminId: string;
  roomId: string;
  role: 'user' | 'assistant';
  content: Record<string, unknown>[];
  createdAt: FirestoreTimestamp | Date | string;
  countsForUsage: boolean;
}

interface FirestoreDraftDoc {
  adminId: string;
  roomId: string;
  toolUseId: string;
  toolName: string;
  args: Record<string, unknown>;
  pendingAssistantContent: Record<string, unknown>[];
  pendingUserMessage: string;
  status: AiDraftStatus;
  createdAt: FirestoreTimestamp | Date | string;
  expiresAt: FirestoreTimestamp | Date | string;
  resolvedAt?: FirestoreTimestamp | Date | string;
  result?: unknown;
  idempotencyKey: string;
}

interface FirestoreRoomMetaDoc {
  adminId: string;
  roomId: string;
  createdAt: FirestoreTimestamp | Date | string;
  updatedAt: FirestoreTimestamp | Date | string;
}

@Injectable()
export class AiFirestoreRepository implements AiStorePort {
  private readonly logger = new Logger(AiFirestoreRepository.name);
  private readonly db: admin.firestore.Firestore;
  private readonly collectionName: string;
  private readonly draftTtlHours: number;

  constructor(private readonly configService: ConfigService) {
    this.db = admin.firestore();
    this.collectionName = this.configService.get<string>(
      'AI_FIRESTORE_COLLECTION',
      'ai_chat',
    );
    this.draftTtlHours = Number(
      this.configService.get<string | number>('AI_DRAFT_TTL_HOURS', 24),
    );
  }

  async countUsageEligibleUserTurns(
    adminId: string,
    monthStart: Date,
  ): Promise<number> {
    const snapshot = await this.db
      .collectionGroup('turns')
      .where('adminId', '==', adminId)
      .where('role', '==', 'user')
      .where('countsForUsage', '==', true)
      .where('createdAt', '>=', monthStart)
      .count()
      .get();

    return snapshot.data().count;
  }

  async findRecentTurns(
    adminId: string,
    roomId: string,
    limit: number,
  ): Promise<AiTurnRecord[]> {
    const snapshot = await this.turnsCollection(adminId, roomId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs
      .map((doc) =>
        this.toTurnRecord(adminId, roomId, doc.id, doc.data() as FirestoreTurnDoc),
      )
      .reverse();
  }

  async createDraft(input: CreateDraftInput): Promise<CreateDraftResult> {
    const draftId = randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + this.draftTtlHours * 60 * 60 * 1000,
    );

    const draftDoc: FirestoreDraftDoc = {
      adminId: input.adminId,
      roomId: input.roomId,
      toolUseId: input.toolUseId,
      toolName: input.toolName,
      args: input.args,
      pendingAssistantContent: input.pendingAssistantContent,
      pendingUserMessage: input.pendingUserMessage,
      status: 'PENDING',
      createdAt,
      expiresAt,
      idempotencyKey: draftId,
    };

    const batch = this.db.batch();
    this.touchRoomBatch(batch, input.adminId, input.roomId, createdAt);
    batch.set(
      this.draftsCollection(input.adminId, input.roomId).doc(draftId),
      stripUndefinedForFirestore(draftDoc),
    );
    await batch.commit();

    return {
      draftId,
      status: 'PENDING',
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async findDraft(
    adminId: string,
    roomId: string,
    draftId: string,
  ): Promise<AiDraftRecord | null> {
    const snapshot = await this.draftsCollection(adminId, roomId)
      .doc(draftId)
      .get();
    if (!snapshot.exists) {
      return null;
    }

    return this.toDraftRecord(draftId, snapshot.data() as FirestoreDraftDoc);
  }

  async resolveDraft(
    input: ResolveDraftInput,
    executionResult: unknown | undefined,
    turnsToPersist: Array<{
      role: 'user' | 'assistant';
      content: Record<string, unknown>[];
      countsForUsage: boolean;
    }>,
  ): Promise<ResolveDraftResult> {
    const draftRef = this.draftsCollection(input.adminId, input.roomId).doc(
      input.draftId,
    );
    const resolvedAt = new Date();
    const nextStatus: AiDraftStatus =
      input.decision === 'approve' ? 'EXECUTED' : 'REJECTED';

    try {
      return await this.db.runTransaction(async (transaction) => {
        const draftSnapshot = await transaction.get(draftRef);
        if (!draftSnapshot.exists) {
          throw new ConflictException('Draft not found');
        }

        const draft = draftSnapshot.data() as FirestoreDraftDoc;
        if (draft.status !== 'PENDING') {
          throw new ConflictException({
            error: 'ALREADY_RESOLVED',
            status: draft.status,
          });
        }

        transaction.update(
          draftRef,
          stripUndefinedForFirestore({
            status: nextStatus,
            resolvedAt,
            result: executionResult,
          }),
        );

        this.touchRoomTransaction(
          transaction,
          input.adminId,
          input.roomId,
          resolvedAt,
        );

        for (const turn of turnsToPersist) {
          const turnRef = this.turnsCollection(input.adminId, input.roomId).doc();
          transaction.set(
            turnRef,
            stripUndefinedForFirestore(
              this.toTurnDoc(
                input.adminId,
                input.roomId,
                turn.role,
                turn.content,
                resolvedAt,
                turn.countsForUsage,
              ),
            ),
          );
        }

        return {
          draftId: input.draftId,
          status: nextStatus,
          result: executionResult,
          resolvedAt: resolvedAt.toISOString(),
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Failed to resolve AI draft', error);
      throw error;
    }
  }

  async saveTurns(input: SaveTurnsInput): Promise<SaveTurnsPersistenceResult> {
    const createdAt = new Date();
    const batch = this.db.batch();
    const turnIds: string[] = [];

    this.touchRoomBatch(batch, input.adminId, input.roomId, createdAt);

    for (const turn of input.turns) {
      const turnRef = this.turnsCollection(input.adminId, input.roomId).doc();
      turnIds.push(turnRef.id);
      batch.set(
        turnRef,
        stripUndefinedForFirestore(
          this.toTurnDoc(
            input.adminId,
            input.roomId,
            turn.role,
            turn.content,
            createdAt,
            turn.role === 'user',
          ),
        ),
      );
    }

    await batch.commit();

    return { ok: true, turnIds };
  }

  private roomDocRef(adminId: string, roomId: string) {
    return this.db
      .collection(this.collectionName)
      .doc(adminId)
      .collection('rooms')
      .doc(roomId);
  }

  private turnsCollection(adminId: string, roomId: string) {
    return this.roomDocRef(adminId, roomId).collection('turns');
  }

  private draftsCollection(adminId: string, roomId: string) {
    return this.roomDocRef(adminId, roomId).collection('drafts');
  }

  private touchRoomBatch(
    batch: admin.firestore.WriteBatch,
    adminId: string,
    roomId: string,
    at: Date,
  ): void {
    const roomMeta: FirestoreRoomMetaDoc = {
      adminId,
      roomId,
      createdAt: at,
      updatedAt: at,
    };
    batch.set(
      this.roomDocRef(adminId, roomId),
      stripUndefinedForFirestore(roomMeta),
      { merge: true },
    );
  }

  private touchRoomTransaction(
    transaction: admin.firestore.Transaction,
    adminId: string,
    roomId: string,
    at: Date,
  ): void {
    transaction.set(
      this.roomDocRef(adminId, roomId),
      stripUndefinedForFirestore({
        adminId,
        roomId,
        updatedAt: at,
      }),
      { merge: true },
    );
  }

  private toTurnDoc(
    adminId: string,
    roomId: string,
    role: 'user' | 'assistant',
    content: Record<string, unknown>[],
    createdAt: Date,
    countsForUsage: boolean,
  ): FirestoreTurnDoc {
    return {
      adminId,
      roomId,
      role,
      content,
      createdAt,
      countsForUsage,
    };
  }

  private toTurnRecord(
    adminId: string,
    roomId: string,
    turnId: string,
    data: FirestoreTurnDoc,
  ): AiTurnRecord {
    return {
      turnId,
      adminId,
      roomId,
      role: data.role,
      content: data.content,
      createdAt: this.toDate(data.createdAt),
      countsForUsage: data.countsForUsage,
    };
  }

  private toDraftRecord(
    draftId: string,
    data: FirestoreDraftDoc,
  ): AiDraftRecord {
    return {
      draftId,
      adminId: data.adminId,
      roomId: data.roomId,
      toolUseId: data.toolUseId,
      toolName: data.toolName,
      args: data.args,
      pendingAssistantContent: data.pendingAssistantContent,
      pendingUserMessage: data.pendingUserMessage,
      status: data.status,
      createdAt: this.toDate(data.createdAt),
      expiresAt: this.toDate(data.expiresAt),
      resolvedAt: data.resolvedAt ? this.toDate(data.resolvedAt) : undefined,
      result: data.result,
      idempotencyKey: data.idempotencyKey,
    };
  }

  private toDate(value: FirestoreTimestamp | Date | string): Date {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string') {
      return new Date(value);
    }
    if (value && typeof value.toDate === 'function') {
      return value.toDate();
    }
    return new Date();
  }
}
