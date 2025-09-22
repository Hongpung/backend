export interface SessionLogMemberReadModel {
  memberId: number;
  name: string;
  nickname: string | null;
  blogUrl: string | null;
  enrollmentNumber: string;
  profileImageUrl: string | null;
  instagramUrl: string | null;
  club?: string;
  role: string[];
}

export interface SessionLogAttendanceReadModel {
  member: SessionLogMemberReadModel;
  status: string;
  timeStamp: string | null;
}

export interface SessionLogBorrowInstrumentReadModel {
  imageUrl: string | null;
  name: string;
  instrumentType: string;
  club?: string;
}

/** 멤버 API — 월별 목록 항목 */
export interface SessionLogListItemReadModel {
  sessionId: number;
  creatorId: number | null;
  creatorName: string;
  creatorNickname: string | null;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  reservationType: string | null;
  participationAvailable: boolean;
  forceEnd: boolean;
  /** 해당 세션 출석(인원) 수 — 목록 API 전용 */
  attendeeCount: number;
}

/** 멤버 API — 세션 상세 */
export interface SessionLogDetailReadModel extends SessionLogListItemReadModel {
  extendCount: number;
  returnImageUrl: unknown;
  reservationId: number | null;
  attendanceList: SessionLogAttendanceReadModel[];
  borrowInstruments: SessionLogBorrowInstrumentReadModel[];
}
