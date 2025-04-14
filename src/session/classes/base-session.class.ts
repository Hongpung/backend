import { timeFormmatForClient, timeFormmatForDB } from 'src/reservation/reservation.utils';
import { v4 as uuidv4 } from 'uuid';

export abstract class BaseSession {

  constructor(
    private readonly _sessionId: string,  // UUID v4로 변경
    private readonly _date: string,
    private readonly _sessionType: 'REALTIME' | 'RESERVED',
    private _title: string,
    private _startTime: string,
    private _endTime: string,
    private _extendCount: number,
    private _participationAvailable: boolean,
    private _status: 'BEFORE' | 'ONAIR' | 'AFTER' | 'DISCARDED',
    private _attendanceList: { user: User; status: '참가' | '출석' | '결석' | '지각'; timeStamp?: Date }[]
  ) {
    this._sessionId = uuidv4(); // UUID v4 생성
    this._extendCount = 0;
  }

  // Getter 메서드
  get sessionId(): string {
    return this._sessionId;
  }

  get date(): string {
    return this._date;
  }

  get sessionType(): 'REALTIME' | 'RESERVED' {
    return this._sessionType;
  }

  get title(): string {
    return this._title;
  }

  get startTime(): string {
    return this._startTime;
  }

  get endTime(): string {
    return this._endTime;
  }

  get extendCount(): number {
    return this._extendCount;
  }

  get participationAvailable(): boolean {
    return this._participationAvailable;
  }

  get status(): 'BEFORE' | 'ONAIR' | 'AFTER' | 'DISCARDED' {
    return this._status;
  }

  get attendanceList(): ReadonlyArray<{ user: User; status: string, timeStamp?: Date }> {
    return this._attendanceList;
  }
  // 공통 메서드 (추상 메서드로 정의)
  abstract attend(user: User, status: string): void;

  abstract toJSON(): object;

  end(): void {
    if (this.status == 'ONAIR') {
      this['_status'] = 'AFTER';
      // 추가적인 종료 로직 (예: 이벤트 발행)
      const utcTime = new Date();

      const newEndTimeString = timeFormmatForClient(utcTime)

      this['_endTime'] = newEndTimeString;

    } else {
      throw Error('Status Error: Is not OnAir session')
    }
  }

  extend(): number {
    if (this.status == 'ONAIR') {
      this['_extendCount'] += 1;

      const utcTime = new Date();
      const nowTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000);
      const nowEndTime = new Date(nowTime.toISOString().split('T')[0] + 'T' + this.endTime + '+09:00');
      const newEndTime = new Date(nowEndTime.getTime() + 30 * 60 * 1000);
      
      const newEndTimeString = timeFormmatForClient(newEndTime);
      console.log("currentEndtime:"+this.endTime, "newEndTime:"+newEndTimeString)//

      this['_endTime'] = newEndTimeString;

      return nowEndTime.getTime() - utcTime.getTime();

    } else {
      throw Error('Status Error: Is not OnAir session')
    }
  }
}
