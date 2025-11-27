import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import { EventBus } from 'src/infrastructure/events/event.provider';
import type { MemberAuthorizationPort } from 'src/features/member/application/ports/out/member-authorization.port';
import { InstrumentService } from './instrument.service';
import type { IInstrumentRepository } from '../repositories/instrument.repository.port';
import {
  createInstrument,
  createInstrumentClub,
} from '../models/instrument.model';

describe('InstrumentService', () => {
  let service: InstrumentService;
  let repository: jest.Mocked<IInstrumentRepository>;
  let memberAuthPort: jest.Mocked<
    Pick<MemberAuthorizationPort, 'getInstrumentManagementContext'>
  >;
  let eventBus: { emitTyped: jest.Mock };

  const ctx = { clubId: 10, clubName: '내 동아리' };

  function existingInstrument(clubId = 10) {
    return createInstrument({
      instrumentId: 5,
      name: '악기',
      instrumentType: 'KWANGGWARI',
      imageUrl: 'https://example.com/a.jpg',
      borrowAvailable: true,
      club: createInstrumentClub({
        clubId,
        clubName: clubId === 10 ? '내 동아리' : '다른 동아리',
      }),
    });
  }

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findDetail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findBorrowableInstruments: jest.fn(),
      findByIds: jest.fn(),
    };
    memberAuthPort = {
      getInstrumentManagementContext: jest.fn(),
    };
    eventBus = { emitTyped: jest.fn() };
    service = new InstrumentService(
      repository,
      memberAuthPort as MemberAuthorizationPort,
      eventBus as unknown as EventBus,
    );
  });

  describe('create', () => {
    it('관리 컨텍스트가 있으면 저장 후 생성 결과를 반환한다', async () => {
      memberAuthPort.getInstrumentManagementContext.mockResolvedValue(ctx);
      const saved = existingInstrument();
      repository.create.mockResolvedValue(saved);

      await expect(
        service.create(100, {
          name: '새 악기',
          instrumentType: 'JANGGU',
          imageUrl: null,
        }),
      ).resolves.toEqual(saved);

      expect(repository.create).toHaveBeenCalledTimes(1);
      const arg = repository.create.mock.calls[0][0];
      expect(arg).toMatchObject({
        instrumentId: 0,
        name: '새 악기',
        instrumentType: 'JANGGU',
        imageUrl: null,
        borrowAvailable: true,
      });
      expect(arg.club.clubId).toBe(ctx.clubId);
      expect(arg.club.clubName).toBe(ctx.clubName);
    });

    it('관리 컨텍스트가 없으면 ForbiddenException', async () => {
      memberAuthPort.getInstrumentManagementContext.mockResolvedValue(null);

      await expect(
        service.create(100, {
          name: 'x',
          instrumentType: 'BUK',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('권한·소유가 일치하면 업데이트된 모델을 반환한다', async () => {
      memberAuthPort.getInstrumentManagementContext.mockResolvedValue(ctx);
      const existing = existingInstrument();
      repository.findDetail.mockResolvedValue(existing);
      const updated = createInstrument({
        instrumentId: existing.instrumentId,
        name: '수정명',
        instrumentType: existing.instrumentType,
        imageUrl: existing.imageUrl,
        borrowAvailable: existing.borrowAvailable,
        club: existing.club,
      });
      repository.update.mockResolvedValue(updated);

      await expect(service.update(100, 5, { name: '수정명' })).resolves.toEqual(
        updated,
      );

      expect(repository.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          name: '수정명',
          instrumentType: 'KWANGGWARI',
          imageUrl: 'https://example.com/a.jpg',
          borrowAvailable: true,
        }),
      );
    });

    it('관리 컨텍스트가 없으면 ForbiddenException', async () => {
      memberAuthPort.getInstrumentManagementContext.mockResolvedValue(null);

      await expect(
        service.update(100, 5, { name: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.findDetail).not.toHaveBeenCalled();
    });

    it('악기가 없으면 NotFoundException', async () => {
      memberAuthPort.getInstrumentManagementContext.mockResolvedValue(ctx);
      repository.findDetail.mockResolvedValue(null);

      await expect(service.update(100, 5, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('다른 동아리 소유 악기면 ForbiddenException', async () => {
      memberAuthPort.getInstrumentManagementContext.mockResolvedValue(ctx);
      repository.findDetail.mockResolvedValue(existingInstrument(99));

      await expect(
        service.update(100, 5, { name: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('imageUrl이 undefined면 기존 imageUrl을 유지한다', async () => {
      memberAuthPort.getInstrumentManagementContext.mockResolvedValue(ctx);
      const existing = existingInstrument();
      repository.findDetail.mockResolvedValue(existing);
      repository.update.mockImplementation(
        async (_id, instrument) => instrument,
      );

      await service.update(100, 5, { name: '바뀜' });

      expect(repository.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          imageUrl: 'https://example.com/a.jpg',
        }),
      );
    });

    it('imageUrl을 null로 명시하면 null로 덮어쓴다', async () => {
      memberAuthPort.getInstrumentManagementContext.mockResolvedValue(ctx);
      const existing = existingInstrument();
      repository.findDetail.mockResolvedValue(existing);
      repository.update.mockImplementation(
        async (_id, instrument) => instrument,
      );

      await service.update(100, 5, { imageUrl: null });

      expect(repository.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          imageUrl: null,
        }),
      );
    });
  });

  describe('remove', () => {
    it('권한·소유가 일치하면 이벤트 발행 후 삭제한다', async () => {
      memberAuthPort.getInstrumentManagementContext.mockResolvedValue(ctx);
      repository.findDetail.mockResolvedValue(existingInstrument());
      repository.delete.mockResolvedValue(undefined);

      await service.remove(100, 5);

      expect(eventBus.emitTyped).toHaveBeenCalledWith(
        EVENT_TOKEN.EDIT_INSTRUMENT,
        {
          instrumentId: 5,
        },
      );
      expect(repository.delete).toHaveBeenCalledWith(5, ctx.clubId);
    });

    it('관리 컨텍스트가 없으면 ForbiddenException', async () => {
      memberAuthPort.getInstrumentManagementContext.mockResolvedValue(null);

      await expect(service.remove(100, 5)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(eventBus.emitTyped).not.toHaveBeenCalled();
    });

    it('악기가 없으면 NotFoundException', async () => {
      memberAuthPort.getInstrumentManagementContext.mockResolvedValue(ctx);
      repository.findDetail.mockResolvedValue(null);

      await expect(service.remove(100, 5)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('다른 동아리 소유 악기면 ForbiddenException', async () => {
      memberAuthPort.getInstrumentManagementContext.mockResolvedValue(ctx);
      repository.findDetail.mockResolvedValue(existingInstrument(99));

      await expect(service.remove(100, 5)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(eventBus.emitTyped).not.toHaveBeenCalled();
    });
  });
});
