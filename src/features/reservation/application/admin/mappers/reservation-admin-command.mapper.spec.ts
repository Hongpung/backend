import { describe, expect, it } from '@jest/globals';
import { AdminBatchCreateReservationCommand } from '../commands/admin-batch-create-reservation.command';
import { AdminForceCreateReservationCommand } from '../commands/admin-force-create-reservation.command';
import { AdminForceDeleteReservationCommand } from '../commands/admin-force-delete-reservation.command';
import { AdminModifyReservationCommand } from '../commands/admin-modify-reservation.command';
import type {
  BatchReservationInput,
  ForceCreateReservationInput,
  ForceUpdateReservationInput,
} from '../../ports/in/reservation-user-command.types';
import { ReservationAdminCommandMapper } from './reservation-admin-command.mapper';

describe('ReservationAdminCommandMapper', () => {
  const adminId = 42;

  describe('toForceCreateCommand', () => {
    it('ForceCreateReservationInput과 adminId를 AdminForceCreateReservationCommand에 그대로 담는다', () => {
      const input: ForceCreateReservationInput = {
        date: '2026-05-22',
        startTime: '10:00',
        endTime: '12:00',
        title: '관리자 강제 생성',
        reservationType: 'REGULAR',
        participationAvailable: true,
        creatorId: 7,
        participatorIds: [1, 2],
        borrowInstrumentIds: [10],
      };

      const command = ReservationAdminCommandMapper.toForceCreateCommand(
        input,
        adminId,
      );

      expect(command).toBeInstanceOf(AdminForceCreateReservationCommand);
      expect(command.createReservationDto).toBe(input);
      expect(command.adminId).toBe(adminId);
    });
  });

  describe('toForceDeleteCommand', () => {
    it('reservationId와 adminId를 AdminForceDeleteReservationCommand에 담는다', () => {
      const reservationId = 99;

      const command = ReservationAdminCommandMapper.toForceDeleteCommand(
        reservationId,
        adminId,
      );

      expect(command).toBeInstanceOf(AdminForceDeleteReservationCommand);
      expect(command.reservationId).toBe(reservationId);
      expect(command.adminId).toBe(adminId);
    });
  });

  describe('toModifyCommand', () => {
    it('부분 ForceUpdateReservationInput을 AdminModifyReservationCommand에 담는다', () => {
      const reservationId = 15;
      const input: ForceUpdateReservationInput = { title: '제목만 변경' };

      const command = ReservationAdminCommandMapper.toModifyCommand(
        reservationId,
        adminId,
        input,
      );

      expect(command).toBeInstanceOf(AdminModifyReservationCommand);
      expect(command.reservationId).toBe(reservationId);
      expect(command.adminId).toBe(adminId);
      expect(command.updateReservationDto).toBe(input);
      expect(command.updateReservationDto.title).toBe('제목만 변경');
      expect(command.updateReservationDto.date).toBeUndefined();
    });
  });

  describe('toBatchCreateCommand', () => {
    it('EXTERNAL 일괄 입력에서 creatorName만 있고 creatorId는 없다', () => {
      const batchInput: BatchReservationInput<'EXTERNAL'> = {
        dayTimes: [{ day: 'MON', startTime: '09:00', endTime: '11:00' }],
        duration: { startDate: '2026-06-01', endDate: '2026-06-30' },
        batchReservationOption: {
          title: '외부 일괄',
          reservationType: 'EXTERNAL',
          creatorName: '외부 단체',
        },
      };

      const command = ReservationAdminCommandMapper.toBatchCreateCommand(
        adminId,
        batchInput,
      );

      expect(command).toBeInstanceOf(AdminBatchCreateReservationCommand);
      expect(command.adminId).toBe(adminId);
      expect(command.batchReservationDTO).toBe(batchInput);
      expect(command.batchReservationDTO.batchReservationOption.creatorName).toBe(
        '외부 단체',
      );
      expect(
        command.batchReservationDTO.batchReservationOption.creatorId,
      ).toBeUndefined();
    });
  });
});
