import type { SessionExtendEvent } from 'src/contracts/events/event.payload';
import type { ExtendSessionLiveNotificationInput } from '../../../application/live-notification.model';

export function toExtendSessionLiveNotificationInput(
  event: SessionExtendEvent,
): ExtendSessionLiveNotificationInput {
  const input: ExtendSessionLiveNotificationInput = {
    sessionId: event.sessionId,
    remainingMsUntilPreviousEnd: event.remainingMsUntilPreviousEnd,
  };

  if (event.endTimeMs !== undefined) {
    input.endTimeMs = event.endTimeMs;
  }

  return input;
}
