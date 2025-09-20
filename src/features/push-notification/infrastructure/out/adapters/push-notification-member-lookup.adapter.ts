import { Inject, Injectable } from '@nestjs/common';
import { MemberLookupUseCase } from 'src/features/member/application/ports/in/member-lookup.use-case';
import type { IPushNotificationMemberLookup } from '../../../application/ports/out/push-notification-member-lookup.port';

@Injectable()
export class PushNotificationMemberLookupAdapter
  implements IPushNotificationMemberLookup
{
  constructor(
    @Inject(MemberLookupUseCase)
    private readonly memberLookupUseCase: MemberLookupUseCase,
  ) {}

  async existsMember(memberId: number): Promise<boolean> {
    return this.memberLookupUseCase.existsMember(memberId);
  }
}
