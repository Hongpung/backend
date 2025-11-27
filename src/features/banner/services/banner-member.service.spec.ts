import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { BannerMemberService } from './banner-member.service';
import type { IBannerRepository } from '../repositories/banner.repository.port';

describe('BannerMemberService', () => {
  let service: BannerMemberService;
  let repository: jest.Mocked<IBannerRepository>;

  beforeEach(() => {
    jest.useFakeTimers();
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
    service = new BannerMemberService(repository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('findOnPost', () => {
    it('오늘 자정 범위에 맞는 날짜 조건으로 조회한다', async () => {
      jest.setSystemTime(new Date('2024-08-10T15:30:00.000Z'));

      await service.findOnPost();

      expect(repository.findByDateConditions).toHaveBeenCalledWith({
        startDateBefore: AppKstDateTime.tomorrowDateAnchorForDb(),
        endDateAfter: AppKstDateTime.todayDateAnchorForDb(),
      });
    });
  });
});
