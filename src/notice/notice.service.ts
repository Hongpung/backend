import { Injectable } from '@nestjs/common';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { PrismaService } from 'src/prisma.service';
import { NotificationService } from 'src/notification/notification.service';
import { josa } from 'es-hangul';

@Injectable()
export class NoticeService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService
  ) { }

  async noticeAll() {
    const notices = await this.prisma.notice.findMany({
      where: { channel: null },
      orderBy: { createdAt: 'desc' }
    });

    return notices.map(notice => ({
      noticeId: notice.noticeId,
      title: notice.title,
      createdAt: notice.createdAt,
      updatedAt: notice.updatedAt,
    }))
  }

  async noticeSpecific(noticeId: number) {

    const notice = await this.prisma.notice.findUnique({
      where: { channel: null, noticeId }
    });

    return {
      noticeId: notice.noticeId,
      title: notice.title,
      content: notice.content,
      createdAt: notice.createdAt,
      updatedAt: notice.updatedAt,
    }
  }

  async create({ noticeAll, ...createNoticeDto }: CreateNoticeDto) {

    const notice = await this.prisma.notice.create({
      data: {
        ...createNoticeDto
      },
      select: { noticeId: true }
    })
    
    const { title, channel } = createNoticeDto;
    const { noticeId } = notice;

    if (noticeAll && !channel)
      await this.notification.sendAllPushNotifications({
        title:'공지사항 안내',
        body: `${josa(title.length > 10 ? title.substring(0, 10) + '...' : title, '이/가')} 공지사항에 추가되었습니다.\n참고해주세요.`,
        data: { noticeId }
      })

    return { message: "success to create notice" }
  }

  async update(id: number, { noticeAll, ...updateNoticeDto }: UpdateNoticeDto) {

    const notice = await this.prisma.notice.update({
      where: { noticeId: id },
      data: {
        ...updateNoticeDto
      },
      select: { channel: true, title: true }
    })

    const { channel, title } = notice;

    if (noticeAll && !channel)
      await this.notification.sendAllPushNotifications({
        title:'공지사항 안내',
        body: `${josa(title.length > 10 ? title.substring(0, 10) + '...' : title, '이/가')} 공지사항에 추가되었습니다.\n참고해주세요.`,
        data: { noticeId: id }
      })

    return { message: "success to update notice" }

  }

  async remove(id: number) {
    await this.prisma.notice.delete({
      where: { noticeId: id }
    })
    return `This action removes a #${id} notice`;
  }
}
