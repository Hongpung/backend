import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { InstrumentEnum } from 'src/instrument/instrument.enum';
import { RoleEnum } from 'src/role/role.enum';

@Injectable()
export class ClubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly instrumentType: InstrumentEnum,
    private readonly roleEnum: RoleEnum
  ) { }


  async getUserClubInfo(clubId: number) {

    const userClub = await this.prisma.club.findUnique({
      where: { clubId },
      select: { RoleAssignment: { include: { member: true } }, profileImageUrl: true }
    })

    if (!userClub) throw new UnauthorizedException("invalid Request: Doesn't exist club")

    const roleData = [{ role: '패짱', member: null }, { role: '상쇠', member: null }]

    userClub.RoleAssignment.map(role => {
      if (role.role == 'LEADER') roleData[0] = { role: '패짱', member: role.member }
      if (role.role == 'SANGSOE') roleData[1] = { role: '상쇠', member: role.member }
    })

    return { roleData, profileImage: userClub.profileImageUrl }
  }

  async getUserClubMembers(clubId: number) {

    const userClubMembers = await this.prisma.club.findUnique({
      where: { clubId },
      select: {
        members: {
          include: {
            club: true,
            roleAssignment: true
          }
        }
      }
    })

    if (!userClubMembers) throw new UnauthorizedException("invalid Request: Doesn't exist club")

    const memberData = userClubMembers.members.map(userStatus => ({
      memberId: userStatus.memberId,
      name: userStatus.name,
      nickname: userStatus.nickname,
      club: userStatus.club.clubName,
      email: userStatus.email,
      enrollmentNumber: userStatus.enrollmentNumber,
      role: userStatus.roleAssignment.map(role => this.roleEnum.EnToKo(role.role)),
      profileImageUrl: userStatus.profileImageUrl,
      instagramUrl: userStatus.instagramUrl,
      blogUrl: userStatus.blogUrl
    }))

    return memberData
  }

  /**
 * 유저 전용 - 동아리 악기 조회
 * @param clubId 
 */
  async instrumentOfClub(clubId: number) {
    const instrumentList = await this.prisma.club.findUnique({
      where: { clubId },
      select: {
        Instrument: {
          select: {
            instrumentType: true,
            instrumentId: true,
            borrowAvailable: true,
            imageUrl: true,
            name: true
          }
        },
        clubName: true
      }
    })

    const { Instrument: instruments, clubName } = instrumentList

    return instruments.map((instrument) => ({
      ...instrument,
      instrumentType: this.instrumentType.EnToKo(instrument.instrumentType),
      club: clubName
    }))
  }

}
