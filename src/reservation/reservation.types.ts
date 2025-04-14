type BaseSessionJson = {
  sessionId: string | number;
  date: string;
  sessionType: string;
  title: string;
  startTime: string;
  endTime: string;
  extendCount: number;
  creatorId?: number;
  creatorName: string;
  creatorNickname?: string;
  participationAvailable: boolean;
  status: 'BEFORE' | 'ONAIR' | 'AFTER' | 'DISCARDED';
  participators?: User[];
  participatorIds?: number[];
  borrowInstruments?: BriefInstrument[];
  attendanceList: { user: User, status: '참가' | '출석' | '결석' | '지각', timeStamp?: Date }[];
};

type RealtimeSessionJson = BaseSessionJson & {
  sessionType: 'REALTIME';
  borrowInstruments?: null;
  status: 'ONAIR' | 'AFTER';
  attendanceList: { user: User, status: '참가', timeStamp?: Date }[];
};

type ReservationSessionJson = BaseSessionJson & {
  reservationId: number;
  sessionType: 'RESERVED';
  reservationType: 'REGULAR' | 'COMMON' | 'EXTERNAL';
  participationAvailable: boolean;
  participators?: User[];
  participatorIds?: number[];
  borrowInstruments?: BriefInstrument[];
  status: 'BEFORE' | 'ONAIR' | 'AFTER' | 'DISCARDED';
  attendanceList: { user: User, status: '출석' | '결석' | '지각', timeStamp?: Date }[];
};

interface ReservationDTO {
  reservationId: number;            // 예약 ID
  date: string;                     // 예약 날짜 (YYYY-MM-DD 형식)
  startTime: string;                // 시작 시간 (HH:MM:SS 형식)
  endTime: string;                  // 종료 시간 (HH:MM:SS 형식)
  title: string;                  // 예약 메시지 또는 설명
  reservationType: 'REGULAR' | 'COMMON' | 'EXTERNAL';                     // 예약 유형 (정기연습, 특별행사 등)
  participationAvailable: boolean;  // 참여 가능 여부
  creatorName: string;              // 생성자 이름
  creatorNickname?: string;
  email?: string;                    // 생성자 이메일
  participators: User[]
  borrowInstruments: BriefInstrument[]
  [key: string]: any
}


interface User {
  memberId: number
  email: string
  name: string
  nickname?: string
  club: string
  enrollmentNumber: string
  role: string[]
  profileImageUrl?: string
}


interface BriefInstrument {
  instrumentId: number
  imageUrl?: string  // url
  name: string
  instrumentType: string
  club: string
  borrowAvailable: boolean,
}