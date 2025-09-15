import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

export interface Banner {
  bannerId?: number;
  owner: string;
  bannerImgUrl: string;
  href: string | null;
  startDate: Date;
  endDate: Date;
}

export function createBanner(data: {
  bannerId?: number;
  owner: string;
  bannerImgUrl: string;
  href: string | null;
  startDate: Date;
  endDate: Date;
}): Banner {
  return {
    bannerId: data.bannerId ?? undefined,
    owner: data.owner,
    bannerImgUrl: data.bannerImgUrl,
    href: data.href,
    startDate: data.startDate,
    endDate: data.endDate,
  };
}

export function isOnPost(banner: Banner, now: Date = new Date()): boolean {
  const today = AppKstDateTime.kstTodayYmd(now);
  const start = AppKstDateTime.kstCalendarYmdFromDbOrString(banner.startDate);
  const end = AppKstDateTime.kstCalendarYmdFromDbOrString(banner.endDate);
  return start <= today && end >= today;
}

export function isBeforePost(banner: Banner, now: Date = new Date()): boolean {
  const today = AppKstDateTime.kstTodayYmd(now);
  const start = AppKstDateTime.kstCalendarYmdFromDbOrString(banner.startDate);
  return start > today;
}

export function isAfterPost(banner: Banner, now: Date = new Date()): boolean {
  const today = AppKstDateTime.kstTodayYmd(now);
  const end = AppKstDateTime.kstCalendarYmdFromDbOrString(banner.endDate);
  return end < today;
}
