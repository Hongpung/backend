import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeleteReservationHandler } from './delete-reservation.handler';
import { DeleteReservationCommand } from '../delete-reservation.command';
import type { IReservationRepository } from 'src/features/reservation/application/ports/out/reservation.repository.port';
import type { ReservationEventPublisherPort } from 'src/features/reservation/application/ports/out/reservation-event-publisher.port';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';

function participator(id: number) {
  return ReservationParticipator.create({
    memberId: id,
    name: `u${id}`,
    nickname: null,
    email: `${id}@test.com`,
    enrollmentNumber: '2021',
    profileImageUrl: null,
    blogUrl: null,
    instagramUrl: null,
    clubName: 'c',
    roles: ['M'],
  });
}

function creatorEntity(memberId: number) {
  return ReservationCreator.create({
    memberId,
    name: '생성자',
    nickname: null,
    email: 'c@test.com',
    enrollmentNumber: '2021',
    profileImageUrl: null,
    blogUrl: null,
    instagramUrl: null,
    clubName: 'c',
    roles: ['L'],
  });
}

describe('DeleteReservationHandler', () => {
  let handler: DeleteReservationHandler;
  let repository: jest.Mocked<
    Pick<IReservationRepository, 'findReservationById' | 'delete'>
  >;
  let eventPublisher: jest.Mocked<
    Pick<ReservationEventPublisherPort, 'sendReservationCanceledNotification'>
  >;

  beforeEach(() => {
    repository = {
      findReservationById: jest.fn(),
      delete: jest.fn(),
    };
    eventPublisher = {
      sendReservationCanceledNotification: jest.fn(async () => undefined),
    };
    handler = new DeleteReservationHandler(
      repository as unknown as IReservationRepository,
      eventPublisher as unknown as ReservationEventPublisherPort,
    );
  });

  it('예약이 없으면 NotFoundException', async () => {
    repository.findReservationById.mockResolvedValue(null);
    await expect(
      handler.execute(new DeleteReservationCommand(1, 10)),
    ).rejects.toThrow(NotFoundException);
  });

  it('creator가 문자열이면 ForbiddenException', async () => {
    const external = ReservationEntity.create({
      date: AppKstDateTime.dateFormmatForDB('2026-05-01'),
      startTime: '10:00',
      endTime: '11:00',
      title: '외부',
      reservationType: 'EXTERNAL',
      participationAvailable: false,
      creator: '외부단체',
      participators: [],
      borrowInstruments: [],
      reservationId: 1,
    });
    repository.findReservationById.mockResolvedValue(external);
    await expect(
      handler.execute(new DeleteReservationCommand(1, 10)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('생성자가 아니면 ForbiddenException', async () => {
    const reservation = ReservationEntity.create({
      date: AppKstDateTime.dateFormmatForDB('2026-05-01'),
      startTime: '10:00',
      endTime: '11:00',
      title: '연습',
      reservationType: 'COMMON',
      participationAvailable: true,
      creator: creatorEntity(10),
      participators: [participator(11)],
      borrowInstruments: [],
      reservationId: 5,
    });
    repository.findReservationById.mockResolvedValue(reservation);
    await expect(
      handler.execute(new DeleteReservationCommand(5, 99)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('정상 삭제 시 저장소 삭제·참여자에게 알림을 보낸다', async () => {
    const reservation = ReservationEntity.create({
      date: AppKstDateTime.dateFormmatForDB('2026-05-01'),
      startTime: '10:00',
      endTime: '11:00',
      title: '연습',
      reservationType: 'COMMON',
      participationAvailable: true,
      creator: creatorEntity(10),
      participators: [participator(11), participator(12)],
      borrowInstruments: [],
      reservationId: 5,
    });
    repository.findReservationById.mockResolvedValue(reservation);

    await expect(
      handler.execute(new DeleteReservationCommand(5, 10)),
    ).resolves.toEqual({ message: '예약이 성공적으로 삭제되었어요.' });

    expect(repository.delete).toHaveBeenCalledWith(5);
    expect(
      eventPublisher.sendReservationCanceledNotification,
    ).toHaveBeenCalledWith(reservation, [11, 12]);
  });

  it('참여자가 생성자만 있으면 알림 이벤트는 발행하지 않는다', async () => {
    const reservation = ReservationEntity.create({
      date: AppKstDateTime.dateFormmatForDB('2026-05-01'),
      startTime: '10:00',
      endTime: '11:00',
      title: '연습',
      reservationType: 'COMMON',
      participationAvailable: true,
      creator: creatorEntity(10),
      participators: [participator(10)],
      borrowInstruments: [],
      reservationId: 5,
    });
    repository.findReservationById.mockResolvedValue(reservation);

    await handler.execute(new DeleteReservationCommand(5, 10));

    expect(
      eventPublisher.sendReservationCanceledNotification,
    ).not.toHaveBeenCalled();
  });
});
