import { v4 as uuidv4 } from 'uuid';
import { BaseSession } from './base-session.class';
import { josa } from 'es-hangul';
import { BASIC_TIME_INTERVAL } from '../constant-variable';
import { timeFormmatForClient } from 'src/reservation/reservation.utils';

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
    private readonly _creatorNickname?: string
  ) {
    super(
      uuidv4(), // UUID v4 생성
      `${new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
      'REALTIME',
      `${josa(_creatorName, '이/가')}만든 실시간 연습`,
      startTime,
      endTime,
      0,
      participationAvailable,
      'ONAIR',
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
    this['_attendanceList'].push({ user, status: '참가', timeStamp: new Date() });
  }

  static parse(json: RealtimeSessionProps): RealtimeSession {
    const utcTime = new Date();
    const endTime = new Date(utcTime.getTime() + BASIC_TIME_INTERVAL)

    const startTimeString = timeFormmatForClient(utcTime)
    const endTimeString = timeFormmatForClient(endTime)

    return new RealtimeSession(
      json.participationAvailable,
      json.startTime ?? startTimeString,
      json.endTime ?? endTimeString,
      json.attendanceList,
      json.creatorName,
      json.creatorId,
      json.creatorNickname
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
      status: this.status as "ONAIR" | "AFTER",
      attendanceList: this.attendanceList as { user: User, status: '참가', timeStamp: Date }[]
    };
  }

}
