export type DiscardedByType = 'SYSTEM' | 'ADMIN';
export type DiscardReason =
  | 'NO_SHOW'
  | 'ADMIN_FORCE_DISCARD'
  | 'SYSTEM_RECOVERY';

export type DiscardedReservationClubSnapshot = {
  clubId: number;
  clubName: string;
};

export type DiscardedReservationRoleSnapshot = {
  roleAssignmentId: number;
  role: string;
  clubId: number | null;
};

export type DiscardedReservationMemberSnapshot = {
  memberId: number;
  name: string;
  nickname: string | null;
  email: string;
  enrollmentNumber: string;
  club: DiscardedReservationClubSnapshot | null;
  roles: DiscardedReservationRoleSnapshot[];
};

export type DiscardedReservationInstrumentSnapshot = {
  instrumentId: number;
  name: string;
  imageUrl: string | null;
  instrumentType: string;
  borrowAvailable: boolean;
  club: DiscardedReservationClubSnapshot | null;
};

export type DiscardedReservationSnapshot = {
  reservationId: number;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  reservationType: string;
  participationAvailable: boolean;
  creatorId: number | null;
  externalCreatorName: string | null;
  creatorSnapshot: DiscardedReservationMemberSnapshot | null;
  participators: DiscardedReservationMemberSnapshot[];
  borrowInstruments: DiscardedReservationInstrumentSnapshot[];
  policy: {
    graceMinutes: number;
  };
};

export class DiscardedReservationVO {
  private constructor(
    private readonly _discardedReservationId: number,
    private readonly _reservationId: number,
    private readonly _discardedByType: DiscardedByType,
    private readonly _discardReason: DiscardReason,
    private readonly _reservation: DiscardedReservationSnapshot,
    private readonly _createdAt: Date,
  ) {}

  static create(params: {
    discardedReservationId: number;
    reservationId: number;
    discardedByType: DiscardedByType;
    discardReason: DiscardReason;
    reservation: DiscardedReservationSnapshot;
    createdAt: Date;
  }): DiscardedReservationVO {
    return new DiscardedReservationVO(
      params.discardedReservationId,
      params.reservationId,
      params.discardedByType,
      params.discardReason,
      params.reservation,
      params.createdAt,
    );
  }

  get discardedReservationId(): number {
    return this._discardedReservationId;
  }
  get reservationId(): number {
    return this._reservationId;
  }
  get discardedByType(): DiscardedByType {
    return this._discardedByType;
  }
  get discardReason(): DiscardReason {
    return this._discardReason;
  }
  get reservation(): DiscardedReservationSnapshot {
    return this._reservation;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
}

export class DiscardedReservationListVO {
  private constructor(
    private readonly _items: DiscardedReservationVO[],
    private readonly _total: number,
  ) {}

  static create(params: {
    items: DiscardedReservationVO[];
    total: number;
  }): DiscardedReservationListVO {
    return new DiscardedReservationListVO(params.items, params.total);
  }

  get items(): DiscardedReservationVO[] {
    return this._items;
  }
  get total(): number {
    return this._total;
  }
}
