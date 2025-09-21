import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { MemberLookupUseCase } from 'src/features/member/application/ports/in/member-lookup.use-case';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';
import { ReservationMemberLookupPort } from 'src/features/reservation/application/ports/out/reservation-member-lookup.port';
import {
  toCreator,
  toParticipator,
} from './mappers/member-to-reservation-domain.mapper';

@Injectable()
export class ReservationMemberLookupAdapter
  implements ReservationMemberLookupPort
{
  constructor(
    @Inject(MemberLookupUseCase)
    private readonly memberLookupUseCase: MemberLookupUseCase,
  ) {}

  async loadCreator(memberId: number): Promise<ReservationCreator> {
    const members = await this.memberLookupUseCase.findMembersByIds([memberId]);
    const member = members.find((m) => m.memberId === memberId);
    if (!member) {
      throw new ForbiddenException('생성자 정보를 찾을 수 없습니다.');
    }
    return toCreator(member);
  }

  async loadCreatorAndParticipators(
    memberId: number,
    participatorIds: number[],
  ): Promise<{
    creator: ReservationCreator;
    participators: ReservationParticipator[];
  }> {
    const allMemberIds = [...new Set([memberId, ...participatorIds])];
    const members = await this.memberLookupUseCase.findMembersByIds(allMemberIds);

    const creatorMember = members.find((m) => m.memberId === memberId);
    if (!creatorMember) {
      throw new ForbiddenException('생성자 정보를 찾을 수 없습니다.');
    }

    const creator = toCreator(creatorMember);
    const participators = members.map((m) => toParticipator(m));

    return { creator, participators };
  }

  async loadParticipatorsById(
    memberIds: number[],
  ): Promise<ReservationParticipator[]> {
    if (memberIds.length === 0) return [];

    const members = await this.memberLookupUseCase.findMembersByIds(memberIds);
    return members.map((m) => toParticipator(m));
  }
}
