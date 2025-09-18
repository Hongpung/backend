import { Injectable, Inject } from '@nestjs/common';
import {
  MemberAuthorizationPort,
  InstrumentManagementContext,
} from '../../../application/ports/out/member-authorization.port';
import {
  MemberRepositoryPort,
  type IMemberRepository,
} from '../../../application/ports/out/member.repository.port';

@Injectable()
export class MemberAuthorizationAdapter implements MemberAuthorizationPort {
  constructor(
    @Inject(MemberRepositoryPort)
    private readonly memberRepository: IMemberRepository,
  ) {}

  async getInstrumentManagementContext(
    memberId: number,
  ): Promise<InstrumentManagementContext | null> {
    const member = await this.memberRepository.findMemberByMemberId(memberId);
    if (!member) return null;
    if (!member.hasAnyRole()) return null;
    if (!member.hasClub() || member.clubId === null) return null;

    const clubName = member.getClubName();
    return {
      clubId: member.clubId,
      clubName: clubName ?? '',
    };
  }
}
