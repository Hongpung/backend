import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { BannerAdminService } from './banner-admin.service';
import { BannerMemberService } from './banner-member.service';
import { createBanner } from '../models/banner.model';
import type { IBannerRepository } from '../repositories/banner.repository.port';

describe('BannerAdminService', () => {
  let service: BannerAdminService;
  let memberService: jest.Mocked<Pick<BannerMemberService, 'findOnPost'>>;
  let repository: jest.Mocked<IBannerRepository>;

  beforeEach(() => {
    jest.useFakeTimers();
    memberService = { findOnPost: jest.fn() };
    memberService.findOnPost.mockResolvedValue([]);
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByDateConditions: jest.fn(),
      findByOwner: jest.fn(),
    } as jest.Mocked<IBannerRepository>;
    repository.findByDateConditions.mockResolvedValue([]);
    service = new BannerAdminService(
      memberService as unknown as BannerMemberService,
      repository,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('findAll', () => {
    it('종료됨·게시중·예정 세 가지 날짜 조건으로 각각 조회한다', async () => {
      jest.setSystemTime(new Date('2024-08-10T12:00:00.000Z'));
      repository.findByDateConditions.mockResolvedValue([]);

      const result = await service.findAll();

      expect(memberService.findOnPost).toHaveBeenCalled();
      expect(repository.findByDateConditions).toHaveBeenCalledTimes(2);

      expect(repository.findByDateConditions).toHaveBeenCalledWith({
        endDateBefore: AppKstDateTime.todayDateAnchorForDb(),
      });

      expect(repository.findByDateConditions).toHaveBeenCalledWith({
        startDateAfter: AppKstDateTime.todayDateAnchorForDb(),
      });

      expect(result.afterPost).toEqual([]);
      expect(result.onPost).toEqual([]);
      expect(result.beforePost).toEqual([]);
    });
  });

  describe('update', () => {
    const existing = createBanner({
      bannerId: 7,
      owner: '기존소유자',
      bannerImgUrl: 'https://old.img',
      href: 'https://old.href',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    });

    it('배너가 없으면 NotFoundException을 던진다', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(99, { owner: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('일부 필드만 넘기면 나머지는 기존 값을 유지한다', async () => {
      repository.findById.mockResolvedValue(existing);
      const updated = createBanner({
        bannerId: existing.bannerId,
        owner: '새소유자',
        bannerImgUrl: existing.bannerImgUrl,
        href: existing.href,
        startDate: existing.startDate,
        endDate: existing.endDate,
      });
      repository.update.mockResolvedValue(updated);

      await service.update(7, { owner: '새소유자' });

      expect(repository.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          bannerId: 7,
          owner: '새소유자',
          bannerImgUrl: existing.bannerImgUrl,
          href: existing.href,
          startDate: existing.startDate,
          endDate: existing.endDate,
        }),
      );
    });

    it('href가 undefined이면 기존 href를 유지한다', async () => {
      repository.findById.mockResolvedValue(existing);
      repository.update.mockImplementation((_id, banner) =>
        Promise.resolve(banner),
      );

      await service.update(7, { owner: '새소유자', href: undefined });

      expect(repository.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ href: existing.href }),
      );
    });

    it('href가 null로 명시되면 링크를 제거한다', async () => {
      repository.findById.mockResolvedValue(existing);
      repository.update.mockImplementation((_id, banner) =>
        Promise.resolve(banner),
      );

      await service.update(7, { href: null });

      expect(repository.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ href: null }),
      );
    });
  });

  describe('remove', () => {
    const existing = createBanner({
      bannerId: 42,
      owner: '소유자',
      bannerImgUrl: 'https://img.test/banner.png',
      href: null,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    });

    it('배너가 없으면 NotFoundException을 던진다', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('배너가 있으면 delete를 해당 id로 호출한다', async () => {
      repository.findById.mockResolvedValue(existing);
      repository.delete.mockResolvedValue(undefined);

      await service.remove(42);

      expect(repository.findById).toHaveBeenCalledWith(42);
      expect(repository.delete).toHaveBeenCalledWith(42);
    });
  });
});
