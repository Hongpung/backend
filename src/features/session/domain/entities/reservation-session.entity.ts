import { v4 as uuidv4 } from 'uuid';
import { BaseSession } from './base-session.entity';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { SessionReservationType } from '../value-objects/session-reservation-type.vo';
import { SessionUser } from '../value-objects/session-user.vo';
import { SessionBriefInstrument } from '../value-objects/session-brief-instrument.vo';

export interface ReservationSessionProps {
  reservationId: number;

  reservationType: SessionReservationType;

  date: string;

  startTime: string;

  endTime: string;

  title: string;

  participationAvailable: boolean;

  creatorName: string;

  participators?: SessionUser[];

  participatorIds?: number[];

  borrowInstruments?: SessionBriefInstrument[];

  creatorId?: number;

  creatorNickname?: string;

  status?: 'BEFORE' | 'ONAIR' | 'AFTER' | 'DISCARDED';

  /** 신규 생성 시 원 슬롯 시작 시각(미넣으면 startTime과 동일) */
  plannedStartTime?: string;

  /** 캐시 복원 시 출석 허용 보상 적용 여부(기본 false) */
  slotAttendanceCompensationApplied?: boolean;

  attendanceList: {
    user: SessionUser;
    status: '출석' | '결석' | '지각';
    timeStamp?: Date;
  }[];
}

export interface ReservationSessionRehydrateProps {
  sessionId: string;
  reservationId: number;
  reservationType: SessionReservationType;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  extendCount: number;
  participationAvailable: boolean;
  creatorName: string;
  participators?: SessionUser[];
  participatorIds?: number[];
  borrowInstruments?: SessionBriefInstrument[];
  creatorId?: number;
  creatorNickname?: string;
  status: 'BEFORE' | 'ONAIR' | 'AFTER' | 'DISCARDED';
  plannedStartTime?: string;
  slotAttendanceCompensationApplied?: boolean;
  attendanceList: {
    user: SessionUser;
    status: '출석' | '결석' | '지각';
    timeStamp?: Date;
  }[];
}

export class ReservationSession extends BaseSession {
  constructor(
    reservationId: number,
    date: string,
    startTime: string,
    endTime: string,
    title: string,
    reservationType: SessionReservationType,
    participationAvailable: boolean,
    status: 'BEFORE' | 'ONAIR' | 'AFTER' | 'DISCARDED',
    attendanceList: {
      user: SessionUser;
      status: '출석' | '결석' | '지각';
      timeStamp?: Date;
    }[],
    private readonly _creatorName: string,
    private readonly _creatorId?: number,
    private readonly _creatorNickname?: string,
    private _participators: SessionUser[] = [],
    private _participatorIds: number[] = [],
    private _borrowInstruments: SessionBriefInstrument[] = [],
    /** 캐시 복원 시 기존 값 유지 (미전달 시 새 세션 생성) */
    restore?: {
      sessionId: string;
      extendCount: number;
    },
    plannedSlotStartHHmm?: string,
    slotAttendanceCompensationApplied?: boolean,
  ) {
    super(
      restore?.sessionId ?? uuidv4(),
      date,
      'RESERVED',
      title,
      startTime,
      endTime,
      restore?.extendCount ?? 0,
      participationAvailable,
      status,
      attendanceList,
    );
    this._reservationId = reservationId;
    this._reservationType = reservationType;
    this._plannedSlotStartHHmm = plannedSlotStartHHmm ?? startTime;
    this._slotAttendanceCompensationApplied =
      slotAttendanceCompensationApplied ?? false;
  }

  private _reservationId: number;
  private _reservationType: SessionReservationType;
  private readonly _plannedSlotStartHHmm: string;
  private _slotAttendanceCompensationApplied: boolean;

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

  get reservationType(): SessionReservationType {
    return this._reservationType;
  }

  get participators(): ReadonlyArray<SessionUser> {
    return this._participators;
  }

  get participatorIds(): ReadonlyArray<number> {
    return this._participatorIds;
  }

  get borrowInstruments(): ReadonlyArray<SessionBriefInstrument> {
    return this._borrowInstruments;
  }

  /** BEFORE→ONAIR 시점부터 참가 출석 허용(지각 마감) 계산용 */
  get slotAttendanceCompensationApplied(): boolean {
    return this._slotAttendanceCompensationApplied;
  }

  start(opts?: { slotAttendanceCompensation: boolean }): void {
    if (this.status == 'BEFORE') {
      if (opts && typeof opts.slotAttendanceCompensation === 'boolean') {
        this._slotAttendanceCompensationApplied =
          opts.slotAttendanceCompensation;
      }
      this['_status'] = 'ONAIR';
      const startTimeString = AppKstDateTime.kstHHmmFromInstant(new Date());

      this['_startTime'] = startTimeString;
    }
  }

  discard(): void {
    if (this.status == 'BEFORE') this['_status'] = 'DISCARDED';
  }

  attend(user: SessionUser, status: '출석' | '결석' | '지각'): void {
    const existingRecord = this['_attendanceList'].find(
      (record) => record.user.memberId === user.memberId,
    );

    const timeStamp = AppKstDateTime.getNowKoreanTime();

    if (existingRecord) {
      // 기존 출결 정보가 있으면 업데이트
      existingRecord.status = status;
      existingRecord.timeStamp = timeStamp;
    } else {
      // 기존 정보가 없으면 새로 추가
      this['_attendanceList'].push({ user, status, timeStamp: timeStamp });
    }
  }

  /** 새 예약 세션 생성 (DB에서 로드) */
  static create(props: ReservationSessionProps): ReservationSession {
    const plannedSlot = props.plannedStartTime ?? props.startTime;
    return new ReservationSession(
      props.reservationId,
      props.date,
      props.startTime,
      props.endTime,
      props.title,
      props.reservationType,
      props.participationAvailable,
      props.status || 'BEFORE',
      props.attendanceList,
      props.creatorName,
      props.creatorId,
      props.creatorNickname,
      props.participators ?? [],
      props.participatorIds ?? [],
      props.borrowInstruments ?? [],
      undefined,
      plannedSlot,
      props.slotAttendanceCompensationApplied ?? false,
    );
  }

  static rehydrate(
    props: ReservationSessionRehydrateProps,
  ): ReservationSession {
    return new ReservationSession(
      props.reservationId,
      props.date,
      props.startTime,
      props.endTime,
      props.title,
      props.reservationType,
      props.participationAvailable,
      props.status,
      props.attendanceList,
      props.creatorName,
      props.creatorId,
      props.creatorNickname,
      props.participators ?? [],
      props.participatorIds ?? [],
      props.borrowInstruments ?? [],
      {
        sessionId: props.sessionId,
        extendCount: props.extendCount,
      },
      props.plannedStartTime ?? props.startTime,
      props.slotAttendanceCompensationApplied ?? false,
    );
  }

  get plannedSlotStartHHmm(): string {
    return this._plannedSlotStartHHmm;
  }
}
