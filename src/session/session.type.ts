interface SessionLog {
  session: RealtimeSessionJson | ReservationSessionJson
  returnImageUrl: string[]
  forceEnd: boolean
}

type SessionState =
  | { status: 'CREATABLE', nextReservationSession: ReservationSessionJson | null }
  | { status: 'STARTABLE', nextReservationSession: ReservationSessionJson }
  | { status: 'JOINABLE', currentSession: ReservationSessionJson | RealtimeSessionJson }
  | { status: 'UNAVAILABLE', errorMessage: string }