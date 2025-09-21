import {
  DiscardedReservationListVO,
  DiscardedReservationVO,
} from 'src/features/discarded-reservation/domain/discarded-reservation.vo';
import {
  DiscardedReservationItemResponseDto,
  DiscardedReservationListResponseDto,
} from '../../dto/response/discarded-reservation.res.dto';

export class DiscardedReservationResponseMapper {
  static toItemDto(
    vo: DiscardedReservationVO,
  ): DiscardedReservationItemResponseDto {
    return {
      discardedReservationId: vo.discardedReservationId,
      reservationId: vo.reservationId,
      discardedByType: vo.discardedByType,
      discardReason: vo.discardReason,
      reservation: vo.reservation,
      createdAt: vo.createdAt,
    };
  }

  static toListDto(
    vo: DiscardedReservationListVO,
  ): DiscardedReservationListResponseDto {
    return {
      items: vo.items.map((item) => this.toItemDto(item)),
      total: vo.total,
    };
  }
}
