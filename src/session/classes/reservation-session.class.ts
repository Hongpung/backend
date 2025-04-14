import { v4 as uuidv4 } from 'uuid';
import { BaseSession } from './base-session.class';
import { timeFormmatForClient } from 'src/reservation/reservation.utils';

export interface ReservationSessionProps extends Partial<ReservationSessionJson> {
  reservationId: number;

  reservationType: 'REGULAR' | 'COMMON' | 'EXTERNAL';

  date: string;

  startTime: string;

  endTime: string;

  title: string;

  participationAvailable: boolean;

  creatorName: string;

  participators?: User[]

  participatorIds?: number[];

  borrowInstruments?: BriefInstrument[]

  creatorId?: number;

  creatorNickname?: string;

  status?: 'BEFORE' | 'ONAIR' | 'AFTER' | 'DISCARDED';

  attendanceList: { user: User, status: '출석' | '결석' | '지각', timeStamp?: Date }[]
}


export class ReservationSession extends BaseSession {

  constructor(
    reservationId: number,
    date: string,
    startTime: string,
    endTime: string,
    title: string,
    reservationType: 'REGULAR' | 'COMMON' | 'EXTERNAL',
    participationAvailable: boolean,
    status: 'BEFORE' | 'ONAIR' | 'AFTER' | 'DISCARDED',
    attendanceList: { user: User; status: '출석' | '결석' | '지각', timeStamp?: Date }[],
    private readonly _creatorName: string,
    private readonly _creatorId?: number,
    private readonly _creatorNickname?: string,
    private _participators: User[] = [],
    private _participatorIds: number[] = [],
    private _borrowInstruments: BriefInstrument[] = []
  ) {
    super(
      uuidv4(), // UUID v4 생성
      date,
      'RESERVED',
      title,
      startTime,
      endTime,
      0,
      participationAvailable,
      status,
      attendanceList
    );
    this._reservationId = reservationId;
    this._reservationType = reservationType;
  }

  private _reservationId: number;
  private _reservationType: 'REGULAR' | 'COMMON' | 'EXTERNAL';

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

  get reservationId(): number {
    return this._reservationId;
  }

  get reservationType(): 'REGULAR' | 'COMMON' | 'EXTERNAL' {
    return this._reservationType;
  }

  get participators(): ReadonlyArray<User> {
    return this._participators;
  }

  get participatorIds(): ReadonlyArray<number> {
    return this._participatorIds;
  }

  get borrowInstruments(): ReadonlyArray<BriefInstrument> {
    return this._borrowInstruments;
  }

  start(): void {
    if (this.status == 'BEFORE') {
      this['_status'] = 'ONAIR';
      const utcTime = new Date();

      const startTimeString = timeFormmatForClient(utcTime)

      this['_startTime'] = startTimeString;
    }
  }

  discard(): void {
    if (this.status == 'BEFORE')
      this['_status'] = 'DISCARDED';
  }

  attend(user: User, status: '출석' | '결석' | '지각'): void {
    const existingRecord = this['_attendanceList'].find(
      (record) => record.user.memberId === user.memberId
    );
  
    if (existingRecord) {
      // 기존 출결 정보가 있으면 업데이트
      existingRecord.status = status;
      existingRecord.timeStamp = new Date();
    } else {
      // 기존 정보가 없으면 새로 추가
      this['_attendanceList'].push({ user, status, timeStamp: new Date() });
    }
  }
  

  static parse(json: ReservationSessionProps): ReservationSession {
    return new ReservationSession(
      json.reservationId,
      json.date,
      json.startTime,
      json.endTime,
      json.title,
      json.reservationType,
      json.participationAvailable,
      json.status || 'BEFORE',
      json.attendanceList,
      json.creatorName,
      json.creatorId,
      json.creatorNickname,
      json.participators,
      json.participatorIds,
      json.borrowInstruments,
    );
  }

  toJSON(): ReservationSessionJson {
    return {
      reservationId: this.reservationId,
      reservationType: this.reservationType,
      sessionId: this.sessionId,
      date: this.date,
      sessionType: "RESERVED",
      title: this.title,
      startTime: this.startTime,
      endTime: this.endTime,
      extendCount: this.extendCount,
      creatorId: this.creatorId,
      creatorName: this.creatorName,
      creatorNickname: this.creatorNickname,
      participationAvailable: this.participationAvailable,
      status: this.status,
      participators: this.participators as User[],
      participatorIds: this.participatorIds as number[],
      borrowInstruments: this.borrowInstruments as BriefInstrument[],
      attendanceList: this.attendanceList as { user: User, status: '출석' | '결석' | '지각', timeStamp: Date }[]
    };
  }
}