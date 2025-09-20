import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { NotificationEntity } from '../../../../domain/notification.entity';
import { NotificationResponseDto } from '../../dto/response/notification-response.dto';

export class NotificationResponseMapper {
  static toResponseDto(entity: NotificationEntity): NotificationResponseDto {
    return {
      notificationId: entity.notificationId,
      memberId: entity.ownerId,
      timestamp: AppKstDateTime.dateTimeFormmatForClient(entity.timestamp),
      isRead: entity.isRead,
      data: entity.data,
    };
  }

  static entityArrayToResponseDtoArray(
    entities: NotificationEntity[],
  ): NotificationResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
