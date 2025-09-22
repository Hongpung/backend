export type PersistSessionLogCommand = {
  runtimeSessionId: string;
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
};
