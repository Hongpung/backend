import type { PersistSessionLogCommand } from '../../commands/persist-session-log.command';
import type { SessionLogDetailReadModel } from '../../../domain/read-models/session-log.read-model';

export const SessionLogCommandRepositoryPort = Symbol(
  'SessionLogCommandRepositoryPort',
);

export interface SessionLogCommandRepositoryPort {
  /**
   * 스냅샷 persist + 상세 조회를 단일 DB 트랜잭션으로 수행한다.
   * 중간 실패 시 insert/update는 자동 롤백된다.
   */
  persistSessionFromSnapshot(
    command: PersistSessionLogCommand,
  ): Promise<SessionLogDetailReadModel>;

  /** timeout 등 트랜잭션 밖 보상 삭제용 (일반 persist 실패에는 사용하지 않음) */
  deleteByRuntimeSessionId(runtimeSessionId: string): Promise<boolean>;
}
