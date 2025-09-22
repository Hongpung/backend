/** session feature 전용. session-log 상세 API와 동일 JSON shape (cross-feature import 없음) */

export interface SessionLogDetailMemberReadModel {
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

export interface SessionLogDetailAttendanceReadModel {
  member: SessionLogDetailMemberReadModel;
  status: string;
  timeStamp: string | null;
}

export interface SessionLogDetailBorrowInstrumentReadModel {
  imageUrl: string | null;
  name: string;
  instrumentType: string;
  club?: string;
}

export interface SessionLogDetailReadModel {
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
  extendCount: number;
  returnImageUrl: unknown;
  reservationId: number | null;
  attendanceList: SessionLogDetailAttendanceReadModel[];
  borrowInstruments: SessionLogDetailBorrowInstrumentReadModel[];
}
