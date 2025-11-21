import { describe, expect, it } from '@jest/globals';
import { buildReservationDeepLink } from 'src/contracts/deep-link/deep-link';
import { RESERVATION_PUSH_NOTIFICATION_KIND } from 'src/features/reservation/application/models/reservation-push-notification.model';
import {
  buildLeaveNotification,
  buildReservationPushNotification,
  buildReservationUpdatedNotification,
  buildUpcomingScheduleNotification,
} from './reservation-push-notification.mapper';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

function participator(memberId: number) {
  return ReservationParticipator.create({
    memberId,
    name: `u${memberId}`,
    nickname: null,
    email: `${memberId}@test.com`,
    enrollmentNumber: '2021',
    profileImageUrl: null,
    blogUrl: null,
    instagramUrl: null,
    clubName: 'c',
    roles: ['M'],
  });
}

function reservationWithParticipators(opts: {
  reservationId: number;
  title: string;
  startTime: string;
  endTime?: string;
  creatorId: number;
  participatorIds: number[];
}) {
  return ReservationEntity.create({
    reservationId: opts.reservationId,
    date: AppKstDateTime.dateFormmatForDB('2026-05-01'),
    startTime: opts.startTime,
    endTime: opts.endTime ?? '11:00',
    title: opts.title,
    reservationType: 'COMMON',
    participationAvailable: true,
    creator: ReservationCreator.create({
      memberId: opts.creatorId,
      name: '생성자',
      nickname: null,
      email: 'c@test.com',
      enrollmentNumber: '2021',
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: 'c',
      roles: ['L'],
    }),
    participators: opts.participatorIds.map(participator),
    borrowInstruments: [],
  });
}

describe('reservation-push-notification.mapper', () => {
  it('buildReservationPushNotification은 UPCOMING_SCHEDULE kind로 동일 payload를 만든다', () => {
    const reservation = reservationWithParticipators({
      reservationId: 10,
      title: '오후 연습',
      startTime: '14:30',
      endTime: '15:30',
      creatorId: 99,
      participatorIds: [1, 2],
    });

    const direct = buildUpcomingScheduleNotification(reservation);
    const viaDispatcher = buildReservationPushNotification({
      kind: RESERVATION_PUSH_NOTIFICATION_KIND.UPCOMING_SCHEDULE,
      reservation,
    });

    expect(viaDispatcher).toEqual(direct);
  });

  it('buildUpcomingScheduleNotification은 예약 시작 알림 형식을 만든다', () => {
    const reservation = reservationWithParticipators({
      reservationId: 10,
      title: '오후 연습',
      startTime: '14:30',
      endTime: '15:30',
      creatorId: 99,
      participatorIds: [1, 2],
    });

    const result = buildUpcomingScheduleNotification(reservation);

    expect(result).toEqual({
      to: [1, 2],
      title: '오늘의 연습실 예약',
      body: '오후 연습이 14시 30분에 시작됩니다.\n늦지 않고 시간안에 도착해야해요.',
      data: { url: buildReservationDeepLink(10) },
    });
  });

  it('buildUpcomingScheduleNotification은 긴 제목을 10자로 잘라 본문에 사용한다', () => {
    const reservation = reservationWithParticipators({
      reservationId: 1,
      title: '아주아주아주긴예약제목입니다',
      startTime: '09:00',
      endTime: '10:00',
      creatorId: 1,
      participatorIds: [5],
    });

    const result = buildUpcomingScheduleNotification(reservation);

    expect(result?.body).toBe(
      '아주아주아주긴예약제...가 9시에 시작됩니다.\n늦지 않고 시간안에 도착해야해요.',
    );
  });

  it('buildReservationUpdatedNotification은 통일된 변경 안내 본문을 만든다', () => {
    const result = buildReservationUpdatedNotification({
      reservationId: 3,
      updatedBy: 99,
      changes: { title: '새 제목', startTime: '11:00' },
      affectedMemberIds: [2, 3],
      reservationTitle: '기존 예약',
    });

    expect(result).toEqual({
      to: [2, 3],
      title: '예약 정보 변경',
      body: '기존 예약에 변경사항이 생겼어요.\n지금 확인해보세요.',
      data: { url: buildReservationDeepLink(3) },
    });
  });

  it('buildReservationUpdatedNotification은 긴 제목을 8자로 잘라 본문에 사용한다', () => {
    const result = buildReservationUpdatedNotification({
      reservationId: 4,
      updatedBy: 1,
      changes: { date: '2026-05-02' },
      affectedMemberIds: [2],
      reservationTitle: '아주아주아주긴예약제목입니다',
    });

    expect(result.body).toBe(
      '아주아주아주긴예...에 변경사항이 생겼어요.\n지금 확인해보세요.',
    );
  });

  it('buildLeaveNotification은 생성자에게 참여 취소 알림을 만든다', () => {
    const reservation = reservationWithParticipators({
      reservationId: 7,
      title: '저녁 연습',
      startTime: '18:00',
      endTime: '19:00',
      creatorId: 10,
      participatorIds: [11],
    });

    const result = buildLeaveNotification(reservation, 11);

    expect(result).toEqual({
      to: [10],
      title: '예약 참여 취소',
      body: '저녁 연습이 예약에서 참여자가 나갔습니다.',
      data: { url: buildReservationDeepLink(7) },
    });
  });

  it('buildLeaveNotification은 긴 예약 제목을 잘라 본문에 사용한다', () => {
    const reservation = reservationWithParticipators({
      reservationId: 8,
      title: '아주아주아주긴예약제목입니다',
      startTime: '18:00',
      endTime: '19:00',
      creatorId: 1,
      participatorIds: [2],
    });

    const result = buildLeaveNotification(reservation, 2);

    expect(result?.body).toBe(
      '아주아주아주긴예약제...가 예약에서 참여자가 나갔습니다.',
    );
  });
});
