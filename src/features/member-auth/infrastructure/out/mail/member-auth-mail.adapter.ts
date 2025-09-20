import { Injectable } from '@nestjs/common';
import { MailService } from 'src/infrastructure/mail/mail.service';
import { MemberAuthMailSenderPort } from '../../../application/ports/out/mail-sender.port';

@Injectable()
export class MemberAuthMailAdapter implements MemberAuthMailSenderPort {
  constructor(private readonly mailService: MailService) {}

  sendSignUpAcceptedMail(email: string, name: string): Promise<void> {
    return this.mailService.sendSignUpAcceptedMail(email, name);
  }

  sendSignUpRequestedMail(email: string, pendingCount: number): Promise<void> {
    return this.mailService.sendSignUpRequestedMail(email, pendingCount);
  }

  sendEmailConfirmMail(email: string, verificationCode: number): Promise<void> {
    return this.mailService.sendEmailConfirmMail(email, verificationCode);
  }

  sendPasswordModifyMail(
    email: string,
    verificationCode: number,
  ): Promise<void> {
    return this.mailService.sendPasswordModifyMail(email, verificationCode);
  }
}
