import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { BannerMemberController } from './controllers/banner-member.controller';
import { BannerAdminController } from './controllers/banner-admin.controller';
import { BannersRedirectController } from './controllers/banners-redirect.controller';
import { BannerMemberService } from './services/banner-member.service';
import { BannerAdminService } from './services/banner-admin.service';
import { BannerRepository } from './repositories/banner.repository';
import { BannerRepositoryPort } from './repositories/banner.repository.port';

@Module({
  imports: [PrismaModule],
  controllers: [
    BannerMemberController,
    BannerAdminController,
    BannersRedirectController,
  ],
  providers: [
    BannerMemberService,
    BannerAdminService,
    {
      provide: BannerRepositoryPort,
      useClass: BannerRepository,
    },
  ],
})
export class BannerModule {}
