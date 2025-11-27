import { describe, expect, it } from '@jest/globals';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { BannerRequestMapper } from './banner.request.mapper';
import type { CreateBannerReqDto } from '../../dto/request/create-banner.req.dto';
import type { UpdateBannerReqDto } from '../../dto/request/update-banner.req.dto';

describe('BannerRequestMapper', () => {
  describe('toCreateParams', () => {
    it('문자열 날짜를 Date로 변환하고 필수 필드를 넘긴다', () => {
      const dto: CreateBannerReqDto = {
        owner: '동아리',
        bannerImgUrl: 'https://cdn.example/a.png',
        startDate: '2024-06-01',
        endDate: '2024-06-30',
      };

      const params = BannerRequestMapper.toCreateParams(dto);

      expect(params.owner).toBe(dto.owner);
      expect(params.bannerImgUrl).toBe(dto.bannerImgUrl);
      expect(params.startDate).toEqual(
        AppKstDateTime.dateFormmatForDB(dto.startDate),
      );
      expect(params.endDate).toEqual(
        AppKstDateTime.dateFormmatForDB(dto.endDate),
      );
    });

    it('href가 없으면 null로 둔다', () => {
      const dto: CreateBannerReqDto = {
        owner: '동아리',
        bannerImgUrl: 'https://cdn.example/a.png',
        startDate: '2024-06-01',
        endDate: '2024-06-30',
      };

      expect(BannerRequestMapper.toCreateParams(dto).href).toBeNull();
    });

    it('href가 있으면 그대로 넘긴다', () => {
      const dto: CreateBannerReqDto = {
        owner: '동아리',
        bannerImgUrl: 'https://cdn.example/a.png',
        href: 'https://example.com',
        startDate: '2024-06-01',
        endDate: '2024-06-30',
      };

      expect(BannerRequestMapper.toCreateParams(dto).href).toBe(
        'https://example.com',
      );
    });
  });

  describe('toUpdateParams', () => {
    it('제공된 문자열 날짜만 Date로 변환한다', () => {
      const dto = {
        startDate: '2024-07-01',
        endDate: '2024-07-31',
      } as UpdateBannerReqDto;

      const params = BannerRequestMapper.toUpdateParams(dto);

      expect(params.startDate).toEqual(
        AppKstDateTime.dateFormmatForDB('2024-07-01'),
      );
      expect(params.endDate).toEqual(
        AppKstDateTime.dateFormmatForDB('2024-07-31'),
      );
    });

    it('날짜 문자열이 없으면 startDate·endDate는 undefined로 둔다', () => {
      const dto = {
        owner: '만 수정',
      } as UpdateBannerReqDto;

      const params = BannerRequestMapper.toUpdateParams(dto);

      expect(params.startDate).toBeUndefined();
      expect(params.endDate).toBeUndefined();
    });

    it('href가 null이면 명시적으로 null을 넘긴다', () => {
      const dto = {
        href: null,
      } as UpdateBannerReqDto;

      expect(BannerRequestMapper.toUpdateParams(dto).href).toBeNull();
    });

    it('href가 undefined이면 필드를 넘기지 않는다', () => {
      const dto = {} as UpdateBannerReqDto;

      expect(BannerRequestMapper.toUpdateParams(dto).href).toBeUndefined();
    });
  });
});
