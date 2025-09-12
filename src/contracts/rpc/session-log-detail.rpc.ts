/** session-log 상세 read model ↔ session endSession RPC 공통 payload */

export interface SessionLogDetailMemberRpc {
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

export interface SessionLogDetailAttendanceRpc {
  member: SessionLogDetailMemberRpc;
  status: string;
  timeStamp: string | null;
}

export interface SessionLogDetailBorrowInstrumentRpc {
  imageUrl: string | null;
  name: string;
  instrumentType: string;
  club?: string;
}

export interface SessionLogDetailRpc {
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
  attendanceList: SessionLogDetailAttendanceRpc[];
  borrowInstruments: SessionLogDetailBorrowInstrumentRpc[];
}
