import { Injectable } from '@nestjs/common';
import { EndSessionSnapshotPort } from '../../../application/ports/out/end-session-snapshot.port';
import { SessionEndSnapshotBuilder } from './session-end-snapshot.builder';

@Injectable()
export class EndSessionSnapshotAdapter implements EndSessionSnapshotPort {
  toPersistRequest(
    params: Parameters<EndSessionSnapshotPort['toPersistRequest']>[0],
  ) {
    return SessionEndSnapshotBuilder.toPersistRequest(params);
  }
}
