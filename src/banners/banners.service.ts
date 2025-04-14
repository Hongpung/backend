import { Injectable } from '@nestjs/common';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class BannersService {
  constructor(
    private readonly prisma: PrismaService
  ) { }

  async create(createBannerDto: CreateBannerDto) {
    return await this.prisma.banner.create(
      { data: createBannerDto }
    );
  }

  async findAll() {
    const [AfterPost, OnPost, BeforePost] = await Promise.all([
      this.findAfterPost(),
      this.findOnPost(),
      this.findBeforePost(),
    ]);
    
    return {AfterPost, OnPost, BeforePost}
  }

  async findAfterPost() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 자정 기준
    return await this.prisma.banner.findMany(
      {
        where: {
          endDate: {
            lt: today
          }
        }
      }
    );
  }

  async findOnPost() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 자정 기준
    return await this.prisma.banner.findMany(
      {
        where: {
          endDate: {
            gte: today
          },
          startDate: {
            lte: today
          }
        }
      }
    );
  }

  async findBeforePost() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 자정 기준
    return await this.prisma.banner.findMany(
      {
        where: {
          startDate: {
            gt: today
          }
        }
      }
    );
  }

  async update(id: number, updateBannerDto: UpdateBannerDto) {
    return await this.prisma.banner.update(
      {
        where: {
          bannerId: id
        },
        data: updateBannerDto
      }
    )
  }

  async remove(id: number) {
    return await this.prisma.banner.delete(
      {
        where: {
          bannerId: id
        }
      }
    )
  }
}
