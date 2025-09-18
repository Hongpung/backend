import { Inject, Injectable } from '@nestjs/common';
import type { MemberEntity } from '../../domain/member.entity';
import type { MemberLookupReadModel } from '../ports/in/member-lookup.read-model';
import { MemberLookupUseCase } from '../ports/in/member-lookup.use-case';
import {
  MemberRepositoryPort,
  type IMemberRepository,
} from '../ports/out/member.repository.port';

function toMemberLookupReadModel(member: MemberEntity): MemberLookupReadModel {
  return {
    memberId: member.memberId,
    name: member.name,
    nickname: member.nickname,
    enrollmentNumber: member.enrollmentNumber,
    email: member.email,
    clubName: member.getClubName(),
    roles: member.getRolesAsString(),
    profileImageUrl: member.profileImageUrl,
    blogUrl: member.blogUrl,
    instagramUrl: member.instagramUrl,
    notificationToken: member.notificationToken,
  };
}

@Injectable()
export class MemberLookupService implements MemberLookupUseCase {
  constructor(
    @Inject(MemberRepositoryPort)
    private readonly memberRepository: IMemberRepository,
  ) {}

  async findMembersByIds(
    memberIds: number[],
  ): Promise<MemberLookupReadModel[]> {
    const members = await this.memberRepository.findMembersByIds(memberIds);
    return members.map(toMemberLookupReadModel);
  }

  async findMemberByMemberId(
    memberId: number,
  ): Promise<MemberLookupReadModel | null> {
    const member = await this.memberRepository.findMemberByMemberId(memberId);
    return member ? toMemberLookupReadModel(member) : null;
  }

  async existsMember(memberId: number): Promise<boolean> {
    return this.memberRepository.existsMember(memberId);
  }
}
