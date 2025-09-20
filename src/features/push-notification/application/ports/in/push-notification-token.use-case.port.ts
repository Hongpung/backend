export const PushNotificationTokenUseCasePort = Symbol(
  'PushNotificationTokenUseCasePort',
);

export interface UpdatePushNotificationTokenParams {
  notificationToken: string;
  pushEnable?: boolean;
}

export interface PushNotificationTokenUseCasePort {
  updatePushNotificationToken(
    memberId: number,
    params: UpdatePushNotificationTokenParams,
  ): Promise<{ message: string }>;

  clearPushNotificationToken(memberId: number): Promise<{ message: string }>;
}
