export interface AdminSessionLogMemberReadModel {
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

export interface AdminSessionLogAttendanceReadModel {
  member: AdminSessionLogMemberReadModel;
  status: string;
  timeStamp: string | null;
}

export interface AdminSessionLogBorrowInstrumentReadModel {
  imageUrl: string | null;
  name: string;
  instrumentType: string;
  club?: string;
}

export interface AdminSessionLogDetailReadModel {
  sessionId: number;
  creatorId: number | null;
  creatorName: string;
  creatorNickname: string | null;
  sessionType: string;
  reservationType: string | null;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  extendCount: number;
  participationAvailable: boolean;
  forceEnd: boolean;
  returnImageUrl: unknown;
  attendanceList: AdminSessionLogAttendanceReadModel[];
  borrowInstruments: AdminSessionLogBorrowInstrumentReadModel[];
}

export interface AdminSessionCalendarDayReadModel {
  date: string;
  sessionCount: number;
}
