import { CREATABLE_MIN_GAP_MS } from '../session.constant';
import { ReservationStartWindowPolicy } from '../runtime/reservation-start-window.policy';
import type { ReservationSession } from '../entities/reservation-session.entity';
import type { RealtimeSession } from '../entities/realtime-session.entity';

type CurrentOnAirReadable = RealtimeSession | ReservationSession;
type NextReservationReadable = ReservationSession;

export class CheckInStateReadVo {
  private constructor(
    readonly nextReservationSession: NextReservationReadable | null,
    readonly currentOnAir: CurrentOnAirReadable | null,
  ) {}

  static from(
    nextReservationSession: NextReservationReadable | null,
    currentOnAir: CurrentOnAirReadable | null,
  ) {
    return new CheckInStateReadVo(nextReservationSession, currentOnAir);
  }

  private plannedStartMs(): number | null {
    return this.nextReservationSession
      ? ReservationStartWindowPolicy.plannedStartMs(this.nextReservationSession)
      : null;
  }

  get gapMs(): number | null {
    const p = this.plannedStartMs();
    return p != null ? p - Date.now() : null;
  }

  get isNextSessionStale(): boolean {
    if (!this.nextReservationSession) return false;
    const compensation = ReservationStartWindowPolicy.compensationApplies({
      currentOnAir: this.currentOnAir,
      nextReservation: this.nextReservationSession,
    });
    return ReservationStartWindowPolicy.isStale({
      plannedStartMs: ReservationStartWindowPolicy.plannedStartMs(
        this.nextReservationSession,
      ),
      nowMs: Date.now(),
      compensation,
    });
  }

  get isCreatable(): boolean {
    return (
      !this.nextReservationSession ||
      this.isNextSessionStale ||
      (this.gapMs != null && this.gapMs > CREATABLE_MIN_GAP_MS)
    );
  }

  get isInStartableWindow(): boolean {
    if (this.gapMs == null || !this.nextReservationSession) return false;
    const compensation = ReservationStartWindowPolicy.compensationApplies({
      currentOnAir: this.currentOnAir,
      nextReservation: this.nextReservationSession,
    });
    return ReservationStartWindowPolicy.isInStartableWindow({
      gapMs: this.gapMs,
      compensation,
    });
  }

  get normalizedNextReservationSession(): NextReservationReadable | null {
    return this.isNextSessionStale ? null : this.nextReservationSession;
  }
}
