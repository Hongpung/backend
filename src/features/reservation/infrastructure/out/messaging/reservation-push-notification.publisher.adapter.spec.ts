import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { buildReservationDeepLink } from 'src/contracts/deep-link/deep-link';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import { ReservationPushNotificationPublisherAdapter } from './reservation-push-notification.publisher.adapter';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

function reservationFixture() {
  return ReservationEntity.create({
    reservationId: 5,
    date: AppKstDateTime.dateFormmatForDB('2026-05-01'),
    startTime: '10:00',
    endTime: '11:00',
    title: '연습',
    reservationType: 'COMMON',
    participationAvailable: true,
    creator: ReservationCreator.create({
      memberId: 10,
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
    participators: [
      ReservationParticipator.create({
        memberId: 11,
        name: 'u11',
        nickname: null,
        email: '11@test.com',
        enrollmentNumber: '2021',
        profileImageUrl: null,
        blogUrl: null,
        instagramUrl: null,
        clubName: 'c',
        roles: ['M'],
      }),
    ],
    borrowInstruments: [],
  });
}

describe('ReservationPushNotificationPublisherAdapter', () => {
  let adapter: ReservationPushNotificationPublisherAdapter;
  let eventBus: any;

  beforeEach(() => {
    eventBus = {
      emitTyped: jest.fn(),
      emitAsyncTyped: jest.fn(async () => []),
      onTyped: jest.fn(),
      onceTyped: jest.fn(),
    };

    adapter = new ReservationPushNotificationPublisherAdapter(eventBus);
  });

  it('sendLeaveNotification은 SEND_NOTIFICATION을 발행한다', async () => {
    const reservation = reservationFixture();

    await adapter.sendLeaveNotification(reservation, 11);

    expect(eventBus.emitAsyncTyped).toHaveBeenCalledWith(
      EVENT_TOKEN.SEND_NOTIFICATION,
      expect.objectContaining({
        to: [10],
        title: '예약 참여 취소',
        data: { url: buildReservationDeepLink(5) },
      }),
    );
  });

  it('sendCreatedInviteNotification은 SEND_NOTIFICATION을 발행한다', async () => {
    await adapter.sendCreatedInviteNotification({
      reservationId: 1,
      title: '제목',
      participatorIds: [2, 3],
    });

    expect(eventBus.emitAsyncTyped).toHaveBeenCalledWith(
      EVENT_TOKEN.SEND_NOTIFICATION,
      {
        to: [2, 3],
        title: '예약 초대',
        body: '제목 예약에 초대되었습니다.',
        data: { url: buildReservationDeepLink(1) },
      },
    );
  });
});
