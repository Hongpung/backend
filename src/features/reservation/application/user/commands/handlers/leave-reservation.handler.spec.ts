import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeaveReservationHandler } from './leave-reservation.handler';
import { LeaveReservationCommand } from '../leave-reservation.command';
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

describe('LeaveReservationHandler', () => {
  let handler: LeaveReservationHandler;
  let repository: jest.Mocked<
    Pick<IReservationRepository, 'findReservationById' | 'save'>
  >;
  let eventPublisher: jest.Mocked<
    Pick<ReservationEventPublisherPort, 'sendLeaveNotification'>
  >;

  beforeEach(() => {
    repository = {
      findReservationById: jest.fn(),
      save: jest.fn(async (r) => r),
    };
    eventPublisher = {
      sendLeaveNotification: jest.fn(async () => undefined),
    };
    handler = new LeaveReservationHandler(
      repository as unknown as IReservationRepository,
      eventPublisher as unknown as ReservationEventPublisherPort,
    );
  });

  it('예약이 없으면 NotFoundException', async () => {
    repository.findReservationById.mockResolvedValue(null);
    await expect(
      handler.execute(new LeaveReservationCommand(1, 10)),
    ).rejects.toThrow(NotFoundException);
  });

  it('해당 멤버가 participator가 아니면 NotFoundException', async () => {
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
      handler.execute(new LeaveReservationCommand(5, 99)),
    ).rejects.toThrow(NotFoundException);
  });

  it('생성자가 나가려 하면 ForbiddenException', async () => {
    const creator = creatorEntity(10);
    const reservation = ReservationEntity.create({
      date: AppKstDateTime.dateFormmatForDB('2026-05-01'),
      startTime: '10:00',
      endTime: '11:00',
      title: '연습',
      reservationType: 'COMMON',
      participationAvailable: true,
      creator,
      participators: [participator(10), participator(11)],
      borrowInstruments: [],
      reservationId: 5,
    });
    repository.findReservationById.mockResolvedValue(reservation);
    await expect(
      handler.execute(new LeaveReservationCommand(5, 10)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('참여자 탈퇴 시 저장·이벤트를 발행한다', async () => {
    const reservation = ReservationEntity.create({
      date: AppKstDateTime.dateFormmatForDB('2026-05-01'),
      startTime: '10:00',
      endTime: '11:00',
      title: '연습',
      reservationType: 'COMMON',
      participationAvailable: true,
      creator: creatorEntity(10),
      participators: [participator(10), participator(11)],
      borrowInstruments: [],
      reservationId: 5,
    });
    repository.findReservationById.mockResolvedValue(reservation);

    await expect(
      handler.execute(new LeaveReservationCommand(5, 11)),
    ).resolves.toEqual({ message: '예약에서 제외됐어요.' });

    expect(repository.save).toHaveBeenCalled();
    const saved = repository.save.mock.calls[0][0] as ReservationEntity;
    expect(saved.participators.map((p) => p.memberId)).not.toContain(11);

    expect(eventPublisher.sendLeaveNotification).toHaveBeenCalledWith(
      saved,
      11,
    );
  });
});
