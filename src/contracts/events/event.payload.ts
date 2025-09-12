// Payload interfaces - transport agnostic event contracts.

import type { PushNotificationDeepLinkData } from '../deep-link/deep-link';

// Notification Events
export interface SendNotificationEvent {
  to: number[];
  title: string;
  body: string;
  data?: PushNotificationDeepLinkData;
}

export interface SendAllNotificationEvent {
  title: string;
  body: string;
  data?: PushNotificationDeepLinkData;
}

// Member auth events
export interface MemberNewDeviceLoginEvent {
  memberId: number;
  deviceId: string;
  deviceName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  loginAt: Date;
}

export interface MemberRefreshTokenReusedEvent {
  memberId: number;
  sessionId: string;
  deviceId: string;
  detectedAt: Date;
}

// Notice Events
export interface NoticeCreatedEvent {
  noticeId: number;
  title: string;
}

// Reservation Events
export interface ReservationCreatedEvent {
  reservationId: number;
  memberId: number;
}

export interface ReservationCanceledEvent {
  reservationId: number;
  canceledBy: number;
}

export interface ReservationUpdatedEvent {
  reservationId: number;
  updatedBy: number;
  changes: {
    title?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
  };
  affectedMemberIds: number[];
  reservationTitle: string;
}

export interface ReservationParticipatorLeftEvent {
  reservationId: number;
  memberId: number;
  reservationTitle: string;
  creatorId: number;
}

export interface ReservationsUpdatedEvent {
  updatedReservationIds: number[];
}

export interface DailyReservationItem {
  reservationId: number;
  reservationType: 'REGULAR' | 'COMMON' | 'EXTERNAL';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss
  endTime: string; // HH:mm:ss
  title: string;
  participationAvailable: boolean;
  creatorName: string;
  creatorId?: number | null;
  creatorNickname?: string | null;
  participators?: {
    memberId: number;
    email: string;
    name: string;
    nickname?: string;
    club: string;
    enrollmentNumber: string;
    role: string[]; // or a more specific type
    profileImageUrl?: string;
  }[];
  borrowInstruments?: {
    instrumentId: number;
    imageUrl?: string;
    name: string;
    instrumentType: string;
    club: string;
    borrowAvailable: boolean;
  }[];
}

export type DailyReservationsLoadedEvent = DailyReservationItem[];

export interface ReservationScheduleNotificationEvent {
  reservationId?: number;
  title: string;
  startTime: string;
  participators: { memberId: number }[];
}

// Session Events
export interface SessionStartingSoonEvent {
  sessionId: number;
  startAt: Date;
}

export interface SessionSnapshotEventPayload {
  date: Date;
  startTime: Date;
  endTime: Date;
  creatorId: number | null;
  title: string;
  sessionType: string;
  reservationType?: string | null;
  reservationId?: number | null;
  extendCount: number;
  participationAvailable: boolean;
  returnImageUrl: string[] | null;
  forceEnd: boolean;
  attendanceList: Array<{
    memberId: number;
    status: string;
    timeStamp: Date;
  }>;
  borrowInstruments: Array<{
    instrumentId: number;
    instrumentSnapshot: string;
  }>;
}

export interface EndSessionEvent {
  sessionId: string | number;
  sessionSnapshot?: SessionSnapshotEventPayload;
}

export interface SessionExtendEvent {
  sessionId: string;
  remainingMsUntilPreviousEnd: number;
  title: string;
  startTimeMs: number;
  endTimeMs: number;
}

export interface EditInstrumentEvent {
  instrumentId: number;
}

// Void events (no payload)
export type VoidEvent = void;

export interface NoShowDiscardReservationEvent {
  reservationId: number;
  sessionId?: string;
}

export interface ServerDownDiscardReservationEvent {
  reservationId: number;
}

/** Bull session job이 시동한 외부 예약 세션과 런타임 대상을 일치시키기 위한 payload */
export interface StartExternalReservationEvent {
  sessionId: string;
  reservationId: number;
}

/** 강제 종료 job이 다른 세션을 건드리지 않도록 대상 sessionId를 실어 보냄 */
export interface ForceEndSessionEvent {
  sessionId: string | number;
}
