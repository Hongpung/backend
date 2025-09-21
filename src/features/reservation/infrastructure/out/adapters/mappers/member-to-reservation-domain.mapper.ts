import type { MemberLookupReadModel } from 'src/features/member/application/ports/in/member-lookup.read-model';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';

export function toCreator(member: MemberLookupReadModel): ReservationCreator {
  return ReservationCreator.create({
    memberId: member.memberId,
    name: member.name,
    nickname: member.nickname,
    email: member.email,
    enrollmentNumber: member.enrollmentNumber,
    profileImageUrl: member.profileImageUrl,
    blogUrl: member.blogUrl,
    instagramUrl: member.instagramUrl,
    clubName: member.clubName,
    roles: member.roles,
  });
}

export function toParticipator(
  member: MemberLookupReadModel,
): ReservationParticipator {
  return ReservationParticipator.create({
    memberId: member.memberId,
    name: member.name,
    nickname: member.nickname,
    email: member.email,
    enrollmentNumber: member.enrollmentNumber,
    profileImageUrl: member.profileImageUrl,
    blogUrl: member.blogUrl,
    instagramUrl: member.instagramUrl,
    clubName: member.clubName,
    roles: member.roles,
  });
}
