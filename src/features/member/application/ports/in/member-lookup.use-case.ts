import type { MemberLookupReadModel } from './member-lookup.read-model';

export abstract class MemberLookupUseCase {
  abstract findMembersByIds(
    memberIds: number[],
  ): Promise<MemberLookupReadModel[]>;

  abstract findMemberByMemberId(
    memberId: number,
  ): Promise<MemberLookupReadModel | null>;

  abstract existsMember(memberId: number): Promise<boolean>;
}
