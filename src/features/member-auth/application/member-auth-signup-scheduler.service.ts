import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MemberAuthAdminUseCasePort } from './ports/in/member-auth-admin.use-case.port';

@Injectable()
export class MemberAuthSignupSchedulerService {
  constructor(
    @Inject(MemberAuthAdminUseCasePort)
    private readonly adminUseCase: MemberAuthAdminUseCasePort,
  ) {}

  /** 매시 정각: 가입 대기 건이 있으면 관리자에게 알림 메일 발송 */
  @Cron('0 * * * *')
  async handleSignUpRequestMail() {
    await this.adminUseCase.sendSignUpRequestMail();
  }
}
