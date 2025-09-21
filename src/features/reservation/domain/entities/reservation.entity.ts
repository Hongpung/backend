import { ReservationType } from '../../reservation.types';
import { ReservationCreator } from './reservation-creator.entity';
import { ReservationParticipator } from './reservation-participator.entity';
import { ReservationBorrowInstrument } from './reservation-borrow-instrument.entity';
import { ReservationTimeRange } from '../value-objects/reservation-time-range.vo';

type ReservationCreateForm =
  | {
      date: Date;
      startTime: string;
      endTime: string;
      title: string;
      reservationType: Exclude<ReservationType, 'EXTERNAL'>;
      participationAvailable: boolean;
      creator: ReservationCreator;
      participators: ReservationParticipator[];
      borrowInstruments: ReservationBorrowInstrument[];
      reservationId?: number;
    }
  | {
      date: Date;
      startTime: string;
      endTime: string;
      title: string;
      reservationType: Extract<ReservationType, 'EXTERNAL'>;
      participationAvailable: boolean;
      creator: string;
      participators: ReservationParticipator[];
      borrowInstruments: ReservationBorrowInstrument[];
      reservationId?: number;
    };

export class ReservationEntity {
  private readonly _reservationId?: number;
  private _date: Date;
  private _timeRange: ReservationTimeRange;
  private _title: string;
  private _reservationType: ReservationType;
  private _participationAvailable: boolean;
  private _creator?: ReservationCreator | string;
  private _participators: ReservationParticipator[];
  private _borrowInstruments: ReservationBorrowInstrument[];

  private constructor(
    date: Date,
    startTime: string,
    endTime: string,
    title: string,
    reservationType: ReservationType,
    participationAvailable: boolean,
    creator: ReservationCreator | string,
    participators: ReservationParticipator[],
    borrowInstruments: ReservationBorrowInstrument[],
    reservationId?: number,
  ) {
    this._date = date;
    this._timeRange = ReservationTimeRange.create(startTime, endTime);
    this._title = title;
    this._reservationType = reservationType;
    this._participationAvailable = participationAvailable;
    this._creator = creator;
    this._participators = participators;
    this._borrowInstruments = borrowInstruments;
    this._reservationId = reservationId;
  }

  get reservationId(): number | undefined {
    return this._reservationId;
  }

  get date(): Date {
    return this._date;
  }

  /** `HH:mm` */
  get startTime(): string {
    return this._timeRange.startTime;
  }

  /** `HH:mm` */
  get endTime(): string {
    return this._timeRange.endTime;
  }

  get title(): string {
    return this._title;
  }

  get reservationType(): ReservationType {
    return this._reservationType;
  }

  get participationAvailable(): boolean {
    return this._participationAvailable;
  }

  get creator(): ReservationCreator | string {
    return this._creator;
  }

  get participators(): ReservationParticipator[] {
    return this._participators;
  }

  get borrowInstruments(): ReservationBorrowInstrument[] {
    return this._borrowInstruments;
  }

  static create({
    date,
    startTime,
    endTime,
    title,
    reservationType,
    participationAvailable,
    creator,
    participators,
    borrowInstruments,
    reservationId,
  }: ReservationCreateForm) {
    return new ReservationEntity(
      date,
      startTime,
      endTime,
      title,
      reservationType,
      participationAvailable,
      creator,
      participators,
      borrowInstruments,
      reservationId,
    );
  }

  rename(title: string) {
    this._title = title;
  }

  updateDate(date: Date) {
    this._date = date;
  }

  updateTime(startTime: string, endTime: string) {
    this._timeRange = ReservationTimeRange.create(startTime, endTime);
  }

  updateCreator(creator: string | ReservationCreator) {
    if (typeof creator === 'string') {
      this._creator = creator;
    } else {
      this._creator = ReservationCreator.create(creator);
    }
  }

  updateParticipationAvailable(participationAvailable: boolean) {
    this._participationAvailable = participationAvailable;
  }

  excludeParticipators(participators: ReservationParticipator[]) {
    this._participators = this._participators.filter(
      (participator) => !participators.includes(participator),
    );
  }

  addParticipators(participators: ReservationParticipator[]) {
    const seen = new Set(this._participators.map((p) => p.memberId));
    const merged = [...this._participators];
    for (const p of participators) {
      if (seen.has(p.memberId)) continue;
      merged.push(p);
      seen.add(p.memberId);
    }
    this._participators = merged;
  }

  excludeBorrowInstruments(borrowInstruments: ReservationBorrowInstrument[]) {
    this._borrowInstruments = this._borrowInstruments.filter(
      (borrowInstrument) => !borrowInstruments.includes(borrowInstrument),
    );
  }

  addBorrowInstruments(borrowInstruments: ReservationBorrowInstrument[]) {
    const seen = new Set(this._borrowInstruments.map((b) => b.instrumentId));
    const merged = [...this._borrowInstruments];
    for (const b of borrowInstruments) {
      if (seen.has(b.instrumentId)) continue;
      merged.push(b);
      seen.add(b.instrumentId);
    }
    this._borrowInstruments = merged;
  }

  updateReservationType(reservationType: ReservationType) {
    this._reservationType = reservationType;
  }
}
