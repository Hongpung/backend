import type { MemberLookupReadModel } from 'src/features/member/application/ports/in/member-lookup.read-model';
import type { LiveNotificationMemberRegistration } from 'src/features/live-session-notification/live-notification/application/ports/out/live-notification-member-lookup.port';

export function toLiveNotificationMemberRegistration(
  member: MemberLookupReadModel,
): LiveNotificationMemberRegistration {
  return {
    memberId: member.memberId,
    expoToken: member.notificationToken,
  };
}
