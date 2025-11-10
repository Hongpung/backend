import { describe, expect, it } from '@jest/globals';
import type { SessionLogRollbackResult } from '../../../application/session-log-rollback.result';
import { SessionLogRollbackResponseMapper } from './session-log-rollback-response.mapper';

describe('SessionLogRollbackResponseMapper', () => {
  it('deleted=true를 RPC response로 변환한다', () => {
    const result: SessionLogRollbackResult = { deleted: true };

    expect(SessionLogRollbackResponseMapper.toRpc(result)).toEqual({
      deleted: true,
    });
  });

  it('deleted=false를 RPC response로 변환한다', () => {
    const result: SessionLogRollbackResult = { deleted: false };

    expect(SessionLogRollbackResponseMapper.toRpc(result)).toEqual({
      deleted: false,
    });
  });
});
