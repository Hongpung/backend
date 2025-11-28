import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import {
  SessionEntity,
  SessionSnapshotStorePort,
} from '../../../application/ports/out/session-snapshot-store.port';
import { SessionCacheMapper } from '../cache/mappers/session-cache.mapper';
import { SessionRestoreMapper } from '../mappers/session.persistence.mapper';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { stripUndefinedForFirestore } from '../cache/session-snapshot-datetime.util';

@Injectable()
export class FirestoreSessionSnapshotAdapter
  implements SessionSnapshotStorePort
{
  private readonly logger = new Logger(FirestoreSessionSnapshotAdapter.name);
  private readonly db: admin.firestore.Firestore;
  private readonly docRef: admin.firestore.DocumentReference;

  constructor(private readonly configService: ConfigService) {
    this.db = admin.firestore();
    const collection = this.configService.get<string>(
      'SESSION_SNAPSHOT_FIRESTORE_COLLECTION',
      'session_snapshots',
    );
    const documentId = this.configService.get<string>(
      'SESSION_SNAPSHOT_FIRESTORE_DOCUMENT',
      'latest',
    );
    this.docRef = this.db.collection(collection).doc(documentId);
  }

  async save(sessions: SessionEntity[]): Promise<void> {
    try {
      const serializedSessions = sessions.map((session) =>
        SessionCacheMapper.toSnapshot(session),
      );
      const snapshot = {
        date: AppKstDateTime.kstTodayYmd(),
        list: serializedSessions,
      };
      await this.docRef.set(stripUndefinedForFirestore(snapshot));
      this.logger.log(
        `${sessions.length} sessions saved to Firestore snapshot.`,
      );
    } catch (error) {
      this.logger.error('Failed to save session snapshot to Firestore', error);
      throw error;
    }
  }

  async load(): Promise<{ date: string; list: SessionEntity[] } | null> {
    try {
      const doc = await this.docRef.get();
      if (!doc.exists) {
        this.logger.warn('No session snapshot found in Firestore.');
        return null;
      }

      const snapshotData = doc.data();
      if (!snapshotData || !snapshotData.list) {
        this.logger.warn('Invalid session snapshot data in Firestore.');
        return null;
      }

      const restoredSessions = snapshotData.list.map((snapshot) =>
        SessionRestoreMapper.fromSnapshot(snapshot),
      );

      this.logger.log(
        `Successfully loaded ${restoredSessions.length} sessions from Firestore snapshot dated ${snapshotData.date}.`,
      );

      return {
        date: snapshotData.date,
        list: restoredSessions,
      };
    } catch (error) {
      this.logger.error(
        'Failed to load session snapshot from Firestore',
        error,
      );
      throw error;
    }
  }
}
