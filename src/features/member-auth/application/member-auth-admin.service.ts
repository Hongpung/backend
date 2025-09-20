import {
  Injectable,
  Inject,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  MemberAuthAdminUseCasePort,
  type SignupListItem,
  type ForceRemoveParams,
} from './ports/in/member-auth-admin.use-case.port';
import {
  MemberAuthRepositoryPort,
  type IMemberAuthRepository,
} from 'src/features/member-auth/application/ports/out/member-auth.repository.port';
import {
  MemberAuthMailSenderPort,
  type MemberAuthMailSenderPort as IMemberAuthMailSenderPort,
} from './ports/out/mail-sender.port';
import { MemberAuthAdminLookupPort } from './ports/out/member-auth-admin-lookup.port';

@Injectable()
export class MemberAuthAdminService implements MemberAuthAdminUseCasePort {
  private readonly logger = new Logger(MemberAuthAdminService.name);

  constructor(
    @Inject(MemberAuthAdminLookupPort)
    private readonly adminLookup: MemberAuthAdminLookupPort,
    @Inject(MemberAuthRepositoryPort)
    private readonly memberAuthRepository: IMemberAuthRepository,
    @Inject(MemberAuthMailSenderPort)
    private readonly mailSender: IMemberAuthMailSenderPort,
  ) {}

  async getPendingSignupList(): Promise<SignupListItem[]> {
    const members = await this.memberAuthRepository.findPendingSignupIds();
    return members.map((member) => ({
      signupId: member.memberId,
      name: member.name,
      nickname: member.nickname,
      club: member.clubName,
      enrollmentNumber: member.enrollmentNumber,
      email: member.email,
    }));
  }

  async getPendingSignupListByClubId(
    clubId: number,
  ): Promise<SignupListItem[]> {
    const members =
      await this.memberAuthRepository.findPendingSignupIdsByClubId(clubId);
    return members.map((member) => ({
      signupId: member.memberId,
      name: member.name,
      nickname: member.nickname,
      club: member.clubName,
      enrollmentNumber: member.enrollmentNumber,
      email: member.email,
    }));
  }

  async acceptSignUp(ids: number[]): Promise<{ message: string }> {
    await this.memberAuthRepository.updateAuthPermission(ids, 'ACCEPTED');

    const acceptedUsers =
      await this.memberAuthRepository.findMembersEmailName(ids);
    await Promise.all(
      acceptedUsers.map(async (user) => {
        try {
          await this.mailSender.sendSignUpAcceptedMail(user.email, user.name);
        } catch (error) {
          this.logger.error(
            `메일 전송 실패: ${user.email}, 에러: ${(error as Error).message}`,
          );
        }
      }),
    );

    return { message: '회원 가입 승인에 성공했습니다.' };
  }

  async rejectSignUp(ids: number[]): Promise<{ message: string }> {
    await this.memberAuthRepository.updateAuthPermission(ids, 'DENIED');
    return { message: '회원 가입 거절에 성공했습니다.' };
  }

  async sendSignUpRequestMail(): Promise<void> {
    const adminEmails = await this.adminLookup.findAdminEmails();
    const pendingSignupCount = (
      await this.memberAuthRepository.findPendingSignupIds()
    ).length;

    if (pendingSignupCount > 0) {
      await Promise.all(
        adminEmails.map(async ({ email }) => {
          try {
            await this.mailSender.sendSignUpRequestedMail(
              email,
              pendingSignupCount,
            );
          } catch (error) {
            this.logger.error(
              `메일 전송 실패: ${email}, 에러: ${(error as Error).message}`,
            );
          }
        }),
      );
    }
  }

  async forceRemove(params: ForceRemoveParams): Promise<{ message: string }> {
    const { adminId, password, targetId } = params;

    const isValid = await this.adminLookup.verifyAdminPassword(
      adminId,
      password,
    );
    if (!isValid) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    await this.memberAuthRepository.deleteAuth(targetId);

    return { message: '회원 탈퇴가 완료되었습니다.' };
  }
}
