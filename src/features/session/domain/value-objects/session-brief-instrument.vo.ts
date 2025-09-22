/**
 * Session 도메인에서 사용하는 악기 정보 (요약 버전)
 * - reservation.types.BriefInstrument로부터 분리되어 session의 독립적인 타입으로 정의
 * - 타입 정의만 포함하며, 비즈니스 로직은 없음
 */

export interface SessionBriefInstrument {
  instrumentId: number;
  imageUrl?: string;
  name: string;
  instrumentType: string;
  club: string;
  borrowAvailable: boolean;
}
