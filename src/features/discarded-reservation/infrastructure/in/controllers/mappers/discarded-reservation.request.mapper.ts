/** 쿼리 파라미터 → application 유스케이스 인자 */
export class DiscardedReservationRequestMapper {
  static toListQuery(
    skip: number,
    take: number,
  ): { skip: number; take: number } {
    return { skip, take };
  }
}
