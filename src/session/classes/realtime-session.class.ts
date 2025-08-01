import { v4 as uuidv4 } from 'uuid';
import { BaseSession } from './base-session.class';
import { josa } from 'es-hangul';
import { BASIC_TIME_INTERVAL } from '../constant-variable';
import { getKoreanTimeString, getNowKoreanTime } from 'src/reservation/reservation.utils';

export interface RealtimeSessionProps extends Partial<RealtimeSessionJson> {
  participationAvailable: boolean,
  attendanceList: { user: User, status: '참가', timeStamp: Date }[],
  creatorName: string,
  creatorId: number,
  creatorNickname?: string
}

export class RealtimeSession extends BaseSession {
  constructor(
    participationAvailable: boolean,
    startTime: string,
    endTime: string,
    attendanceList: { user: User; status: '참가', timeStamp: Date }[],
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
    }
  ) {
    super(
      restore?.sessionId ?? uuidv4(),
      restore?.date ?? `${new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
      'REALTIME',
      restore?.title ?? `${josa(_creatorName, '이/가')} 만든 실시간 연습`,
      startTime,
      endTime,
      restore?.extendCount ?? 0,
      participationAvailable,
      restore?.status ?? 'ONAIR',
      attendanceList
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

  attend(user: User): void {
    this['_attendanceList'].push({ user, status: '참가', timeStamp: getNowKoreanTime() });
  }

  /** 새 실시간 세션 생성 (start/end는 getKoreanTimeString으로 KST HH:mm) */
  static create(props: RealtimeSessionProps): RealtimeSession {
    const now = new Date();
    const endTime = new Date(now.getTime() + BASIC_TIME_INTERVAL);
    const startTimeString = getKoreanTimeString(now);
    const endTimeString = getKoreanTimeString(endTime);

    return new RealtimeSession(
      props.participationAvailable,
      props.startTime ?? startTimeString,
      props.endTime ?? endTimeString,
      props.attendanceList,
      props.creatorName,
      props.creatorId,
      props.creatorNickname
    );
  }

  /** 캐시에서 세션 복원 */
  static restore(json: RealtimeSessionJson): RealtimeSession {
    const attendanceList = json.attendanceList.map(({ user, status, timeStamp }) => ({
      user,
      status: status as '참가',
      timeStamp: timeStamp ? new Date(timeStamp) : new Date(),
    }));

    return new RealtimeSession(
      json.participationAvailable,
      json.startTime,
      json.endTime,
      attendanceList,
      json.creatorName,
      json.creatorId,
      json.creatorNickname,
      {
        sessionId: String(json.sessionId),
        date: json.date,
        title: json.title,
        status: json.status === 'AFTER' ? 'AFTER' : 'ONAIR',
        extendCount: json.extendCount ?? 0,
      }
    );
  }

  toJSON(): RealtimeSessionJson {
    return {
      sessionId: this.sessionId,
      date: this.date,
      sessionType: 'REALTIME',
      title: this.title,
      startTime: this.startTime,
      endTime: this.endTime,
      extendCount: this.extendCount,
      creatorId: this.creatorId,
      creatorName: this.creatorName,
      creatorNickname: this.creatorNickname,
      participationAvailable: this.participationAvailable,
      status: this.status === 'AFTER' ? 'AFTER' : 'ONAIR',
      attendanceList: this.attendanceList.map(({ user, status, timeStamp }) => ({
        user,
        status: status as '참가',
        timeStamp: timeStamp ?? new Date(),
      }))
    };
  }

}
