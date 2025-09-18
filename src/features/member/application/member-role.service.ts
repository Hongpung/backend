import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { MemberRoleUseCasePort } from './ports/in/member-role.use-case.port';
import {
  MemberRepositoryPort,
  type IMemberRepository,
} from './ports/out/member.repository.port';
import { RoleEnum } from 'src/role/role.enum';
import type { KoRole } from 'src/role/role.type';

@Injectable()
export class MemberRoleService implements MemberRoleUseCasePort {
  constructor(
    @Inject(MemberRepositoryPort)
    private readonly repository: IMemberRepository,
  ) {}

  async assignRole(memberId: number, roles: KoRole[]) {
    const member = await this.repository.findMemberByMemberId(memberId);

    if (!member || !member.hasClub()) {
      throw new BadRequestException("동아리가 없는 회원입니다.");
    }

    const enRoles = roles.map((kor) => RoleEnum.KoToEn(kor));

    try {
      await this.repository.transaction(async (tx) => {
        await this.repository.deleteRoleAssignments(
          memberId,
          member.clubId!,
          tx,
        );

        for (const role of enRoles) {
          const prevRoleAssignmentId =
            await this.repository.findRoleAssignmentIdByRoleAndClub(
              role,
              member.clubId!,
            );

          if (prevRoleAssignmentId) {
            await this.repository.updateRoleAssignment(
              prevRoleAssignmentId,
              memberId,
              tx,
            );
          } else {
            await this.repository.createRoleAssignment(
              { clubId: member.clubId!, memberId, role },
              tx,
            );
          }
        }
      });

      return { message: '역할 배정이 완료되었어요.' };
    } catch {
      throw new InternalServerErrorException('역할 배정에 실패했어요.');
    }
  }
}
