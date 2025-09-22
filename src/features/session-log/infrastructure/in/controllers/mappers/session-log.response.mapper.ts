import type {
  SessionLogDetailReadModel,
  SessionLogListItemReadModel,
} from '../../../../domain/read-models/session-log.read-model';
import type { SessionLogDetailResDto } from '../../dto/response/session-log-detail.res.dto';
import type { SessionLogResDto } from '../../dto/response/session-log.res.dto';

export class SessionLogResponseMapper {
  static toMonthlyList(
    rows: SessionLogListItemReadModel[],
  ): SessionLogResDto[] {
    return rows;
  }

  static toDetail(
    row: SessionLogDetailReadModel | null,
  ): SessionLogDetailResDto | null {
    return row;
  }
}
