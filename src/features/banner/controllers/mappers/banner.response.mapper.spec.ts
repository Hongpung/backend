import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { createBanner } from '../../models/banner.model';
import { BannerResponseMapper } from './banner.response.mapper';

function makeBanner(
  overrides?: Partial<Parameters<typeof createBanner>[0]>,
) {
  return createBanner({
    bannerId: 7,
    owner: '동아리',
    bannerImgUrl: 'https://cdn.example/b.png',
    href: 'https://link.example',
    startDate: new Date('2024-06-01T00:00:00.000Z'),
    endDate: new Date('2024-06-30T23:59:59.999Z'),
    ...overrides,
  });
}

describe('BannerResponseMapper', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('toDto', () => {
    it('배너 모델 필드와 게시 상태 플래그를 응답 DTO로 매핑한다', () => {
      jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
      const banner = makeBanner();

      expect(BannerResponseMapper.toDto(banner)).toMatchObject({
        bannerId: 7,
        owner: '동아리',
        bannerImgUrl: 'https://cdn.example/b.png',
        href: 'https://link.example',
        startDate: banner.startDate,
        endDate: banner.endDate,
      });
    });

    it('href가 null이면 응답에서 href 필드를 생략한다', () => {
      jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
      const banner = makeBanner({ href: null });

      expect(BannerResponseMapper.toDto(banner).href).toBeUndefined();
    });
  });

  describe('toDtoArray', () => {
    it('배너 배열을 DTO 배열로 변환한다', () => {
      jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
      const banners = [
        makeBanner({ bannerId: 1 }),
        makeBanner({ bannerId: 2, owner: 'B' }),
      ];

      const dtos = BannerResponseMapper.toDtoArray(banners);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].bannerId).toBe(1);
      expect(dtos[1].owner).toBe('B');
    });
  });

  describe('toCreateResDto', () => {
    it('생성 응답에 배너 필드와 기본 메시지를 담는다', () => {
      const banner = makeBanner({ bannerId: 42, href: null });

      expect(BannerResponseMapper.toCreateResDto(banner)).toEqual({
        bannerId: 42,
        owner: banner.owner,
        bannerImgUrl: banner.bannerImgUrl,
        href: undefined,
        startDate: banner.startDate,
        endDate: banner.endDate,
        message: '배너 생성이 완료되었습니다.',
      });
    });

    it('전달한 메시지로 덮어쓸 수 있다', () => {
      const banner = makeBanner();

      expect(
        BannerResponseMapper.toCreateResDto(banner, '커스텀 생성').message,
      ).toBe('커스텀 생성');
    });
  });

  describe('toUpdateResDto', () => {
    it('수정 응답에 배너 필드와 기본 메시지를 담는다', () => {
      const banner = makeBanner({ bannerId: 3 });

      expect(BannerResponseMapper.toUpdateResDto(banner)).toMatchObject({
        bannerId: 3,
        message: '배너 수정이 완료되었습니다.',
      });
    });

    it('전달한 메시지로 덮어쓸 수 있다', () => {
      const banner = makeBanner();

      expect(
        BannerResponseMapper.toUpdateResDto(banner, '수정 완료').message,
      ).toBe('수정 완료');
    });
  });

  describe('toDeleteResDto', () => {
    it('기본 삭제 메시지를 반환한다', () => {
      expect(BannerResponseMapper.toDeleteResDto()).toEqual({
        message: '배너 삭제가 완료되었습니다.',
      });
    });

    it('전달한 메시지로 덮어쓸 수 있다', () => {
      expect(BannerResponseMapper.toDeleteResDto('삭제됨').message).toBe(
        '삭제됨',
      );
    });
  });

  describe('toListResDto', () => {
    it('게시 후·중·전 그룹을 각각 DTO 배열로 묶는다', () => {
      jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
      const afterPost = [
        makeBanner({
          bannerId: 1,
          startDate: new Date('2024-05-01'),
          endDate: new Date('2024-05-31'),
        }),
      ];
      const onPost = [makeBanner({ bannerId: 2 })];
      const beforePost = [
        makeBanner({
          bannerId: 3,
          startDate: new Date('2024-07-01'),
          endDate: new Date('2024-07-31'),
        }),
      ];

      const dto = BannerResponseMapper.toListResDto(
        afterPost,
        onPost,
        beforePost,
      );

      expect(dto.AfterPost).toHaveLength(1);
      expect(dto.AfterPost[0].bannerId).toBe(1);

      expect(dto.OnPost).toHaveLength(1);
      expect(dto.OnPost[0].bannerId).toBe(2);
    

      expect(dto.BeforePost).toHaveLength(1);
      expect(dto.BeforePost[0].bannerId).toBe(3);
    });
  });
});
