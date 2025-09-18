import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  MemberProfileUseCasePort,
  type UpdateMemberByAdminParams,
  type UpdateMemberProfileParams,
} from './ports/in/member-profile.use-case.port';
import {
  MemberRepositoryPort,
  type IMemberRepository,
} from './ports/out/member.repository.port';
import {
  MemberAdminAuthPort,
  type IMemberAdminAuthPort,
} from './ports/out/member-admin-auth.port';

@Injectable()
export class MemberProfileService implements MemberProfileUseCasePort {
  constructor(
    @Inject(MemberRepositoryPort)
    private readonly repository: IMemberRepository,
    @Inject(MemberAdminAuthPort)
    private readonly memberAdminAuth: IMemberAdminAuthPort,
  ) {}

  async getMyStatus(memberId: number) {
    const member = await this.repository.findMemberByMemberId(memberId);
    if (!member) {
      throw new NotFoundException(`MemberId: '${memberId}' is not exist`);
    }
    return member;
  }

  async updateMyStatus(memberId: number, data: UpdateMemberProfileParams) {
    const exists = await this.repository.findMemberByMemberId(memberId);
    if (!exists) {
      throw new NotFoundException(`MemberId: '${memberId}' is not exist`);
    }
    return this.repository.updateMemberProfile(memberId, data);
  }

  async updateMemberByAdmin(
    adminMemberId: number,
    targetMemberId: number,
    data: UpdateMemberByAdminParams,
  ) {
    const exists = await this.repository.findMemberByMemberId(targetMemberId);
    if (!exists) {
      throw new NotFoundException(`MemberId: '${targetMemberId}' is not exist`);
    }

    const payloadKeys: (keyof UpdateMemberByAdminParams)[] = [
      'nickname',
      'name',
      'clubId',
      'email',
    ];
    const hasPersistableField = payloadKeys.some((k) => data[k] !== undefined);
    if (!hasPersistableField) {
      throw new BadRequestException('변경할 항목이 없습니다.');
    }

    const nextName = data.name !== undefined ? data.name.trim() : undefined;
    if (nextName !== undefined && nextName.length === 0) {
      throw new BadRequestException('이름은 비워둘 수 없습니다.');
    }

    const nextEmail = data.email !== undefined ? data.email.trim() : undefined;
    const emailChanging =
      nextEmail !== undefined &&
      nextEmail.toLowerCase() !== exists.email.toLowerCase();

    const clubChanging =
      data.clubId !== undefined && data.clubId !== exists.clubId;

    if (emailChanging || clubChanging) {
      const pwd = data.adminPassword?.trim();
      if (!pwd) {
        throw new BadRequestException(
          '동아리 또는 로그인 아이디(이메일) 변경 시 관리자 비밀번호가 필요합니다.',
        );
      }
      const ok = await this.memberAdminAuth.verifyAdminPassword(
        adminMemberId,
        pwd,
      );
      if (!ok) {
        throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
      }
    }

    const {
      adminPassword: _ignored,
      email: _rawEmail,
      name: _rawName,
      ...persistBase
    } = data;
    return this.repository.updateMemberProfile(targetMemberId, {
      ...persistBase,
      ...(nextEmail !== undefined ? { email: nextEmail } : {}),
      ...(nextName !== undefined ? { name: nextName } : {}),
    });
  }
}
