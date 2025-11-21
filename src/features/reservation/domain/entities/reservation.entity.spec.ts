import { describe, expect, it } from '@jest/globals';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationEntity } from './reservation.entity';
import { ReservationCreator } from './reservation-creator.entity';
import { ReservationParticipator } from './reservation-participator.entity';
import { ReservationBorrowInstrument } from './reservation-borrow-instrument.entity';

function baseParticipator(
  overrides: Partial<{ memberId: number; name: string }> = {},
) {
  return ReservationParticipator.create({
    memberId: overrides.memberId ?? 1,
    name: overrides.name ?? '참여자',
    nickname: null,
    email: 'p@test.com',
    enrollmentNumber: '20210001',
    profileImageUrl: null,
    blogUrl: null,
    instagramUrl: null,
    clubName: '동아리',
    roles: ['MEMBER'],
  });
}

function baseCreator(overrides: Partial<{ memberId: number }> = {}) {
  return ReservationCreator.create({
    memberId: overrides.memberId ?? 10,
    name: '생성자',
    nickname: null,
    email: 'c@test.com',
    enrollmentNumber: '20210002',
    profileImageUrl: null,
    blogUrl: null,
    instagramUrl: null,
    clubName: '동아리',
    roles: ['LEADER'],
  });
}

function baseInstrument(id: number) {
  return ReservationBorrowInstrument.create({
    instrumentId: id,
    name: '장구',
    instrumentType: 'JANGGU',
    imageUrl: null,
    borrowAvailable: true,
    clubName: '동아리',
  });
}

function makeReservation() {
  const a = baseParticipator({ memberId: 1, name: 'A' });
  const b = baseParticipator({ memberId: 2, name: 'B' });
  return ReservationEntity.create({
    date: AppKstDateTime.dateFormmatForDB('2026-05-10'),
    startTime: '10:00',
    endTime: '11:00',
    title: '연습',
    reservationType: 'COMMON',
    participationAvailable: true,
    creator: baseCreator(),
    participators: [a, b],
    borrowInstruments: [baseInstrument(100), baseInstrument(101)],
  });
}

describe('ReservationEntity', () => {
  it('rename, updateDate, updateTime, updateParticipationAvailable이 반영된다', () => {
    const r = makeReservation();
    r.rename('새 제목');
    r.updateDate(AppKstDateTime.dateFormmatForDB('2026-05-11'));
    r.updateTime('14:00', '15:30');
    r.updateParticipationAvailable(false);
    expect(r.title).toBe('새 제목');
    expect(r.date).toEqual(AppKstDateTime.dateFormmatForDB('2026-05-11'));
    expect(r.startTime).toBe('14:00');
    expect(r.endTime).toBe('15:30');
    expect(r.participationAvailable).toBe(false);
  });

  it('excludeParticipators는 전달한 참여자만 제거한다', () => {
    const r = makeReservation();
    const [, second] = r.participators;
    r.excludeParticipators([second]);
    expect(r.participators.map((p) => p.memberId)).toEqual([1]);
  });

  it('addParticipators는 기존 참여자를 유지하고 새 멤버만 추가한다', () => {
    const r = makeReservation();
    const c = baseParticipator({ memberId: 3, name: 'C' });
    const idsBefore = r.participators.map((p) => p.memberId);
    r.addParticipators([c]);
    expect(r.participators.map((p) => p.memberId)).toEqual([...idsBefore, 3]);
  });

  it('addParticipators는 동일 memberId 중복 추가를 무시한다', () => {
    const r = makeReservation();
    const dup = baseParticipator({ memberId: 1, name: '다른이름' });
    r.addParticipators([dup]);
    expect(r.participators.filter((p) => p.memberId === 1)).toHaveLength(1);
    expect(r.participators.find((p) => p.memberId === 1)?.name).toBe('A');
  });

  it('excludeBorrowInstruments는 해당 악기만 제거한다', () => {
    const r = makeReservation();
    const [, secondInst] = r.borrowInstruments;
    r.excludeBorrowInstruments([secondInst]);
    expect(r.borrowInstruments.map((i) => i.instrumentId)).toEqual([100]);
  });

  it('addBorrowInstruments는 기존 악기를 유지하고 새 id만 추가한다', () => {
    const r = makeReservation();
    const idsBefore = r.borrowInstruments.map((i) => i.instrumentId);
    r.addBorrowInstruments([baseInstrument(102)]);
    expect(r.borrowInstruments.map((i) => i.instrumentId)).toEqual([
      ...idsBefore,
      102,
    ]);
  });

  it('addBorrowInstruments는 동일 instrumentId 중복 추가를 무시한다', () => {
    const r = makeReservation();
    const dup = ReservationBorrowInstrument.create({
      instrumentId: 100,
      name: '다른이름',
      instrumentType: 'BUK',
      imageUrl: null,
      borrowAvailable: false,
      clubName: '동아리',
    });
    r.addBorrowInstruments([dup]);
    expect(
      r.borrowInstruments.filter((i) => i.instrumentId === 100),
    ).toHaveLength(1);
  });

  it('updateCreator는 문자열 또는 ReservationCreator를 반영한다', () => {
    const r = makeReservation();
    r.updateCreator('외부 이름');
    expect(r.creator).toBe('외부 이름');

    const creator = baseCreator({ memberId: 99 });
    r.updateCreator(creator);
    expect(r.creator).toBeInstanceOf(ReservationCreator);
    expect((r.creator as ReservationCreator).memberId).toBe(99);
  });

  it('updateReservationType이 반영된다', () => {
    const r = makeReservation();
    r.updateReservationType('REGULAR');
    expect(r.reservationType).toBe('REGULAR');
  });
});
