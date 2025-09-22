import { v4 as uuidv4 } from 'uuid';
import { BaseSession } from './base-session.entity';
import { josa } from 'es-hangul';
import { BASIC_TIME_INTERVAL } from '../session.constant';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { SessionUser } from '../value-objects/session-user.vo';

export interface RealtimeSessionProps {
  participationAvailable: boolean;
  startTime?: string;
  endTime?: string;
  attendanceList: { user: SessionUser; status: '참가'; timeStamp: Date }[];
  creatorName: string;
  creatorId: number;
  creatorNickname?: string;
}

export interface RealtimeSessionRehydrateProps {
  sessionId: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  extendCount: number;
  creatorName: string;
  creatorId?: number;
  creatorNickname?: string;
  participationAvailable: boolean;
  status: 'ONAIR' | 'AFTER';
  attendanceList: { user: SessionUser; status: '참가'; timeStamp: Date }[];
}

export class RealtimeSession extends BaseSession {
  constructor(
    participationAvailable: boolean,
    startTime: string,
    endTime: string,
    attendanceList: { user: SessionUser; status: '참가'; timeStamp: Date }[],
    private readonly _creatorName: string,
    private readonly _creatorId?: number,
    private readonly _creatorNickname?: string,
    /** 캐시 복원 시 기존 값 유지 (미전달 시 새 세션 생성) */
    restore?: {
      sessionId: string;
      date: string;
      title: string;
      status: 'ONAIR' | 'AFTER';
      extendCount: number;
    },
  ) {
    super(
      restore?.sessionId ?? uuidv4(),
      restore?.date ?? AppKstDateTime.kstTodayYmd(),
      'REALTIME',
      restore?.title ?? `${josa(_creatorName, '이/가')} 만든 실시간 연습`,
      startTime,
      endTime,
      restore?.extendCount ?? 0,
      participationAvailable,
      restore?.status ?? 'ONAIR',
      attendanceList,
    );
  }

  // Getter 메서드
  get creatorId(): number | undefined {
    return this._creatorId;
  }

  get creatorName(): string {
    return this._creatorName;
  }

  get creatorNickname(): string | undefined {
    return this._creatorNickname;
  }

  attend(user: SessionUser): void {
    this['_attendanceList'].push({
      user,
      status: '참가',
      timeStamp: AppKstDateTime.getNowKoreanTime(),
    });
  }

  /** 새 실시간 세션 생성 (start/end는 KST 벽시각 HH:mm) */
  static create(props: RealtimeSessionProps): RealtimeSession {
    const now = new Date();
    const endTime = new Date(now.getTime() + BASIC_TIME_INTERVAL);
    const startTimeString = AppKstDateTime.kstHHmmFromInstant(now);
    const endTimeString = AppKstDateTime.kstHHmmFromInstant(endTime);

    return new RealtimeSession(
      props.participationAvailable,
      props.startTime ?? startTimeString,
      props.endTime ?? endTimeString,
      props.attendanceList,
      props.creatorName,
      props.creatorId,
      props.creatorNickname,
    );
  }

  static rehydrate(props: RealtimeSessionRehydrateProps): RealtimeSession {
    return new RealtimeSession(
      props.participationAvailable,
      props.startTime,
      props.endTime,
      props.attendanceList,
      props.creatorName,
      props.creatorId,
      props.creatorNickname,
      {
        sessionId: props.sessionId,
        date: props.date,
        title: props.title,
        status: props.status,
        extendCount: props.extendCount,
      },
    );
  }
}
