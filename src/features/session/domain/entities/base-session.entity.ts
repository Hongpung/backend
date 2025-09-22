import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { BASIC_TIME_INTERVAL } from '../session.constant';
import { SessionUser } from '../value-objects/session-user.vo';

export abstract class BaseSession {
  constructor(
    private readonly _sessionId: string, // UUID v4로 변경
    private readonly _date: string,
    private readonly _sessionType: 'REALTIME' | 'RESERVED',
    private _title: string,
    private _startTime: string,
    private _endTime: string,
    private _extendCount: number,
    private _participationAvailable: boolean,
    private _status: 'BEFORE' | 'ONAIR' | 'AFTER' | 'DISCARDED',
    private _attendanceList: {
      user: SessionUser;
      status: '참가' | '출석' | '결석' | '지각';
      timeStamp?: Date;
    }[],
  ) {}

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

  get attendanceList(): ReadonlyArray<{
    user: SessionUser;
    status: string;
    timeStamp?: Date;
  }> {
    return this._attendanceList;
  }
  // 공통 메서드 (추상 메서드로 정의)
  abstract attend(user: SessionUser, status: string): void;

  end(): void {
    if (this.status == 'ONAIR') {
      this['_status'] = 'AFTER';
      const kstTime = AppKstDateTime.getNowKoreanTime();
      this['_endTime'] = AppKstDateTime.timeFormmatForClient(kstTime);
    } else {
      throw Error('Status Error: Is not OnAir session');
    }
  }

  extend(targetEndMs?: number): number {
    if (this.status == 'ONAIR') {
      this['_extendCount'] += 1;

      const utcTime = new Date();
      const endInstant = AppKstDateTime.parseKstDateTime(this.date, this.endTime);
      const currentEndMs = endInstant.getTime();
      const resolvedEndMs =
        targetEndMs ?? currentEndMs + BASIC_TIME_INTERVAL;

      if (resolvedEndMs <= currentEndMs) {
        throw new Error(
          'Invalid extend: target end must be after current end',
        );
      }

      const newEndTimeString = AppKstDateTime.kstHHmmFromInstant(
        new Date(resolvedEndMs),
      );

      this['_endTime'] = newEndTimeString;

      return resolvedEndMs - utcTime.getTime();
    } else {
      throw Error('Status Error: Is not OnAir session');
    }
  }
}
