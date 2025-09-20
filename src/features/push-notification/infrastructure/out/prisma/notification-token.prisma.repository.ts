import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { INotificationTokenRepository } from '../../../application/ports/out/notification-token.repository.port';
import { NotificationTokenPrismaMapper } from './mappers/notification-token.prisma.mapper';
import { UserNotificationTokenEntity } from '../../../domain/user-notification-token.entity';

@Injectable()
export class PrismaNotificationTokenRepository
  implements INotificationTokenRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAllNotificationTokens(): Promise<UserNotificationTokenEntity[]> {
    const members = await this.prisma.member.findMany({
      select: { memberId: true, notificationToken: true, pushEnable: true },
    });

    return members.map((member) =>
      NotificationTokenPrismaMapper.fromPrismaMember(member),
    );
  }

  async findOneNotificationToken(
    memberId: number,
  ): Promise<UserNotificationTokenEntity | null> {
    const member = await this.prisma.member.findUnique({
      where: { memberId },
      select: { memberId: true, notificationToken: true, pushEnable: true },
    });

    if (!member) return null;

    return NotificationTokenPrismaMapper.fromPrismaMember(member);
  }

  async findPushTargetsByMemberIds(
    memberIds: number[],
  ): Promise<UserNotificationTokenEntity[]> {
    if (memberIds.length === 0) {
      return [];
    }

    const members = await this.prisma.member.findMany({
      where: { memberId: { in: memberIds } },
      select: { memberId: true, notificationToken: true, pushEnable: true },
    });

    return members.map((member) =>
      NotificationTokenPrismaMapper.fromPrismaMember(member),
    );
  }

  async saveToken(
    memberId: number,
    command: { notificationToken: string; pushEnable: boolean },
  ): Promise<void> {
    await this.prisma.member.update({
      where: { memberId },
      data: {
        notificationToken: command.notificationToken,
        pushEnable: command.pushEnable,
      },
    });
  }

  async removeToken(memberId: number): Promise<void> {
    await this.prisma.member.update({
      where: { memberId },
      data: { notificationToken: null, pushEnable: false },
    });
  }

  async updatePushEnable(entity: UserNotificationTokenEntity): Promise<void> {
    const data = NotificationTokenPrismaMapper.toPrismaData(entity);
    await this.prisma.member.update({
      where: { memberId: entity.memberId },
      data,
    });
  }
}
