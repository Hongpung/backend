import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MemberLookupUseCase } from 'src/features/member/application/ports/in/member-lookup.use-case';
import { LiveNotificationMemberLookupPort } from 'src/features/live-session-notification/live-notification/application/ports/out/live-notification-member-lookup.port';
import { toLiveNotificationMemberRegistration } from '../mappers/member-to-live-notification.mapper';

@Injectable()
export class LiveNotificationMemberLookupAdapter
  implements LiveNotificationMemberLookupPort
{
  private readonly logger = new Logger(
    LiveNotificationMemberLookupAdapter.name,
  );

  constructor(
    @Inject(MemberLookupUseCase)
    private readonly memberLookupUseCase: MemberLookupUseCase,
  ) {}

  async loadMemberForRegistration(memberId: number) {
    const member = await this.memberLookupUseCase.findMemberByMemberId(memberId);

    if (!member) {
      this.logger.error(`회원을 찾을 수 없습니다. memberId=${memberId}`);
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    return toLiveNotificationMemberRegistration(member);
  }
}
