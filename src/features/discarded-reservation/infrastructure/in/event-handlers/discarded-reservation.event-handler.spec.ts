import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { IDiscardedReservationRepository } from 'src/features/discarded-reservation/application/ports/out/discarded-reservation.repository.port';
import { DiscardedReservationEventHandler } from './discarded-reservation.event-handler';

describe('DiscardedReservationEventHandler', () => {
  let handler: DiscardedReservationEventHandler;
  let repository: {
    saveNoShowByReservationId: jest.MockedFunction<
      (
        reservationId: number,
        reason?: Parameters<
          IDiscardedReservationRepository['saveNoShowByReservationId']
        >[1],
      ) => Promise<void>
    >;
  };

  beforeEach(() => {
    repository = {
      saveNoShowByReservationId: jest.fn(async () => undefined),
    };
    handler = new DiscardedReservationEventHandler(
      repository as unknown as IDiscardedReservationRepository,
    );
  });

  it('노쇼 이벤트 시 reservationId와 NO_SHOW로 저장 포트를 호출한다', async () => {
    await handler.handleNoShowDiscardReservation({ reservationId: 1 });

    expect(repository.saveNoShowByReservationId).toHaveBeenCalledWith(
      1,
      'NO_SHOW',
    );
  });

  it('서버 다운 복구 이벤트 시 reservationId와 SYSTEM_RECOVERY로 저장 포트를 호출한다', async () => {
    await handler.handleServerDownDiscardReservation({ reservationId: 2 });

    expect(repository.saveNoShowByReservationId).toHaveBeenCalledWith(
      2,
      'SYSTEM_RECOVERY',
    );
  });
});
