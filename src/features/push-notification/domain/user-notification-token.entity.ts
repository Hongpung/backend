export class UserNotificationTokenEntity {
  constructor(
    private _memberId: number,
    private _notificationToken: string | null,
    private _pushEnable: boolean,
  ) {}

  get memberId() {
    return this._memberId;
  }

  get notificationToken() {
    return this._notificationToken;
  }

  get pushEnable() {
    return this._pushEnable;
  }

  /** 토큰 등록 (기기 최초 인증 or 변경) */
  registerToken(token: string) {
    this._notificationToken = token;
    if (this._pushEnable === false) this._pushEnable = true;
  }

  /** 사용자 알림 수신 활성화 */
  enablePush() {
    if (!this._notificationToken) {
      throw new Error('푸시 수신 활성화 불가: 토큰이 등록되지 않았습니다.');
    }

    this._pushEnable = true;
  }

  /** 사용자 알림 수신 비활성화 */
  disablePush() {
    this._pushEnable = false;
  }

  /** 사용자가 디바이스 삭제하거나 로그아웃 등 */
  removeToken() {
    this._notificationToken = null;
    this._pushEnable = false;
  }

  isPushEnabled() {
    return this._pushEnable && this._notificationToken;
  }

  getReceiverInfo(): {
    memberId: number;
    notificationToken: string | null;
    pushEnable: boolean;
  } {
    return {
      memberId: this._memberId,
      notificationToken: this._notificationToken,
      pushEnable: this._pushEnable,
    };
  }

  toEntity() {
    return {
      memberId: this._memberId,
      notificationToken: this._notificationToken,
      pushEnable: this._pushEnable,
    };
  }
}
