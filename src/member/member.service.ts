import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { RoleEnum } from 'src/role/role.enum';
import { RoleAssignmentDto } from './dto/roleAssignment.dto';

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleEnum: RoleEnum
  ) { }

  async updatePushEnable(memberDto: { memberId: number, pushEnable: boolean, notificationToken?: string }) {
    const { pushEnable, notificationToken } = memberDto;
    try {
      await this.prisma.member.update({
        where: { memberId: memberDto.memberId },
        data: { pushEnable, notificationToken },
      })

      return Response.json({ message: 'update success' })
    } catch {
      throw new BadRequestException('잘못된 요청입니다.')
    }
  }

  async adminFindUserByOption({ username, clubId, role }: { username?: string, clubId?: string, role?: string }) {
    const andConditions: any[] = [];

    if (username && username.trim() !== '') {
      andConditions.push({
        OR: [
          { name: { contains: username } },
          { nickname: { contains: username } },
        ],
      });
    }

    if (clubId) {
      andConditions.push({ clubId: +clubId });
    }

    if (role) {
      andConditions.push({
        roleAssignment: { some: { role: this.roleEnum.KoToEn(role) } },
      });
    }

    const findMembers = await this.prisma.member.findMany({
      where: {
        AND: andConditions.length > 0 ? andConditions : Prisma.skip,
        isPermmited: 'ACCEPTED'
      },
      include: {
        club: true,
        roleAssignment: true,
      },
      orderBy: { enrollmentNumber: 'asc' }
    });

    console.log(findMembers)

    return findMembers.map(({ club, roleAssignment, ...member }) => ({
      memberId: member.memberId,
      name: member.name,
      nickname: member.nickname,
      club: club?.clubName,
      email: member.email,
      enrollmentNumber: member.enrollmentNumber,
      role: roleAssignment.map(role => this.roleEnum.EnToKo(role.role)),
      profileImageUrl: member.profileImageUrl,
      instagramUrl: member.instagramUrl,
      blogUrl: member.blogUrl,
    }))

  }

  async adminFindUserByOptionUsingPage({ username, clubId, role, page = 0 }: { username?: string, clubId?: string, role?: string, page?: number }) {

    const andConditions: Record<string, any>[] = [];

    if (username && username.trim() !== '') {
      andConditions.push({
        OR: [
          { name: { contains: username } },
          { nickname: { contains: username } },
        ],
      });
    }

    if (clubId) {
      andConditions.push({ clubId: +clubId });
    }

    if (role) {
      andConditions.push({
        roleAssignment: { some: { role: this.roleEnum.KoToEn(role) } },
      });
    }

    // 기본 limit을 20으로 설정
    const take = 20;
    const skip = page * take;

    // 전체 개수 조회
    const totalCount = await this.prisma.member.count({
      where: {
        AND: andConditions.length > 0 ? andConditions : Prisma.skip,
        isPermmited: 'ACCEPTED'
      }
    });

    const findMembers = await this.prisma.member.findMany({
      where: {
        AND: andConditions.length > 0 ? andConditions : Prisma.skip,
        isPermmited: 'ACCEPTED'
      },
      include: {
        club: true,
        roleAssignment: true,
      },
      orderBy: { enrollmentNumber: 'asc' },
      take,
      skip,
    });

    const members = findMembers.map(({ club, roleAssignment, ...member }) => ({
      memberId: member.memberId,
      name: member.name,
      nickname: member.nickname,
      club: club?.clubName,
      email: member.email,
      enrollmentNumber: member.enrollmentNumber,
      role: roleAssignment.map(role => this.roleEnum.EnToKo(role.role)),
      profileImageUrl: member.profileImageUrl,
      instagramUrl: member.instagramUrl,
      blogUrl: member.blogUrl,
    }));

    return { totalPages: Math.ceil(totalCount / (take ?? 20)), members };
  }

  async findOneInformation(id: number) {
    const userStatus = await this.prisma.member.findUnique({
      where: { memberId: id },
      include: {
        club: true,
        roleAssignment: true
      }
    })

    if (!userStatus) throw new NotFoundException(`UserId: '${id}' is not exist`)

    return {
      memberId: userStatus.memberId,
      name: userStatus.name,
      nickname: userStatus.nickname,
      club: userStatus.club?.clubName,
      email: userStatus.email,
      enrollmentNumber: userStatus.enrollmentNumber,
      role: userStatus.roleAssignment.map(role => this.roleEnum.EnToKo(role.role)),
      profileImageUrl: userStatus.profileImageUrl,
      instagramUrl: userStatus.instagramUrl,
      blogUrl: userStatus.blogUrl,
    }
  }

  async updateUserInfo(InformationData: { memberId: number, profileImageUrl?: string | null, nickname?: string | null, instagramUrl?: string | null, blogUrl?: string | null }) {

    const { memberId, nickname, instagramUrl, blogUrl, profileImageUrl } = InformationData;
    const isRegistered = await this.prisma.member.findUnique({
      where: { memberId },
      select: { memberId: true }
    })

    if (!isRegistered) throw new NotFoundException(`UserId: '${memberId}' is not exist`)

    const userStatus = await this.prisma.member.update({
      where: { memberId },
      data: {
        profileImageUrl: profileImageUrl === undefined ? Prisma.skip : profileImageUrl,
        nickname: nickname === undefined ? Prisma.skip : nickname,
        instagramUrl: instagramUrl === undefined ? Prisma.skip : instagramUrl,
        blogUrl: blogUrl === undefined ? Prisma.skip : blogUrl,
      },
      include: {
        club: true,
        roleAssignment: true
      }
    })

    return {
      memberId: userStatus.memberId,
      name: userStatus.name,
      nickname: userStatus.nickname,
      club: userStatus.club?.clubName,
      email: userStatus.email,
      enrollmentNumber: userStatus.enrollmentNumber,
      role: userStatus.roleAssignment.map(role => this.roleEnum.EnToKo(role.role)),
      profileImageUrl: userStatus.profileImageUrl,
      instagramUrl: userStatus.instagramUrl,
      blogUrl: userStatus.blogUrl,
    }
  }

  async deleteNotificationToken(memberId: number) {
    return await this.prisma.member.update({
      where: { memberId: memberId },
      data: { notificationToken: null, pushEnable: false }
    })
  }

  /**
     * 유저 전용 - 초대 가능 인원 조회
     * @param memberId 
     * @params username, clubId, role
     */
  async invitePossibleList(memberId: number, { username, clubIds, minEnrollmentNumber, maxEnrollmentNumber }: { username?: string, clubIds?: number[], minEnrollmentNumber?: string, maxEnrollmentNumber?: string }) {

    if (!!username || clubIds.length > 0 || !!minEnrollmentNumber || !!maxEnrollmentNumber) {
      const andConditions: Object[] = [];

      if (username && username.trim() !== '') {
        andConditions.push({
          OR: [
            { name: { contains: username } },
            { nickname: { contains: username } },
          ],
        });
      }

      if (clubIds.length > 0) {
        andConditions.push({ clubId: { in: clubIds } });
      }

      if (!!minEnrollmentNumber) {
        andConditions.push({
          enrollmentNumber: { gte: minEnrollmentNumber }
        });
      }

      if (!!maxEnrollmentNumber) {
        andConditions.push({
          enrollmentNumber: { lte: maxEnrollmentNumber }
        });
      }

      const invitePossibleList = await this.prisma.member.findMany({
        where: {
          AND: andConditions
        },
        include: { roleAssignment: true, club: true }
      })

      return invitePossibleList.filter(member => member.memberId != memberId).map((member) => {
        return ({
          memberId: member.memberId,
          name: member.name,
          nickname: member.nickname,
          club: member.club?.clubName,
          email: member.email,
          enrollmentNumber: member.enrollmentNumber,
          role: member.roleAssignment.map(role => this.roleEnum.EnToKo(role.role)),
          profileImageUrl: member.profileImageUrl,
          instagramUrl: member.instagramUrl,
          blogUrl: member.blogUrl,
        })
      })
    }
    else {
      const invitePossibleList = await this.prisma.member.findMany({
        include: { roleAssignment: true, club: true }
      })

      return invitePossibleList.filter(member => member.memberId != memberId).map((member) => {
        return ({
          memberId: member.memberId,
          name: member.name,
          nickname: member.nickname,
          club: member.club?.clubName,
          email: member.email,
          enrollmentNumber: member.enrollmentNumber,
          role: member.roleAssignment.map(role => this.roleEnum.EnToKo(role.role)),
          profileImageUrl: member.profileImageUrl,
          instagramUrl: member.instagramUrl,
          blogUrl: member.blogUrl,
        })
      })
    }
  }
  //나중에 전체 공지 업로드 시 사용
  async findAllNotificationTokens() {
    return await this.prisma.member.findMany({
      select: { memberId: true, notificationToken: true, pushEnable: true }
    })
  }

  //예약 알림 전송시 사용
  async findSomeNotificationTokens(memberIds: number[]) {
    return await this.prisma.member.findMany({
      where: { memberId: { in: memberIds } },
      select: { notificationToken: true, pushEnable: true }
    })
  }

  async findOneNotificationToken(id: number) {
    return await this.prisma.member.findUnique({
      where: { memberId: id },
      select: { notificationToken: true, pushEnable: true },
    })
  }


  async assignRole(memberId: number, roleAssignmentDto: RoleAssignmentDto) {

    const { role: koRole } = roleAssignmentDto

    const member = await this.prisma.member.findUnique({
      where: { memberId },
      select: { clubId: true }
    })

    if (member.clubId === null) throw new BadRequestException("User Isn't have club")

    const roles = koRole.map(kor => this.roleEnum.KoToEn(kor))

    try {
      await this.prisma.$transaction(async (prisma) => {
        await prisma.roleAssignment.deleteMany({
          where: { memberId, clubId: member.clubId }
        });

        await Promise.all(roles.map(async (role) => {

          console.log({ clubId: member.clubId, memberId, role });

          const prevRoleAssignment = await prisma.roleAssignment.findFirst({
            where: { role, clubId: member.clubId },
            select: { roleAssignmentId: true },
          });

          if (prevRoleAssignment) {
            await prisma.roleAssignment.update({
              where: { roleAssignmentId: prevRoleAssignment.roleAssignmentId },
              data: { memberId },
            });
          } else {
            await prisma.roleAssignment.create({
              data: { clubId: member.clubId, memberId, role },
            });
          }
        }));
      });

      return { message: 'Assignment is done successfully' };
    } catch (error) {
      throw new InternalServerErrorException('Failed to assign Roles');
    }

  }
}
