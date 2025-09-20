import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

export class NotificationEntity {
  private _notificationId: number;
  private _memberId: number;
  private _timestamp: Date;
  private _isRead: boolean;
  private _data: any;

  private constructor(
    notificationId: number,
    memberId: number,
    timestamp: Date,
    isRead: boolean,
    data: any,
  ) {
    this._notificationId = notificationId;
    this._memberId = memberId;
    this._timestamp = timestamp;
    this._isRead = isRead;
    this._data = data;
  }

  static create(notification: {
    notificationId: number;
    memberId: number;
    timestamp?: Date;
    isRead?: boolean;
    data: any; // JSON 파싱된 데이터
  }) {
    return new NotificationEntity(
      notification.notificationId,
      notification.memberId,
      notification.timestamp ?? AppKstDateTime.getNowKoreanTime(),
      notification.isRead ?? false,
      notification.data,
    );
  }

  get notificationId() {
    return this._notificationId;
  }

  get ownerId() {
    return this._memberId;
  }

  get timestamp() {
    return this._timestamp;
  }

  get isRead() {
    return this._isRead;
  }

  get data() {
    return this._data;
  }

  markAsRead() {
    this._isRead = true;
  }
}
