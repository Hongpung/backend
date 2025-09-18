import { Module } from '@nestjs/common';
import { AdminController } from './infrastructure/in/controllers/admin.controller';
import { AdminService } from './application/admin.service';
import { AdminRepositoryPort } from './application/ports/out/admin.repository.port';
import { AdminUseCasePort } from './application/ports/in/admin.use-case.port';
import { AdminLevelLookupUseCase } from './application/ports/in/admin-level-lookup.use-case';
import { AdminLevelLookupService } from './application/use-case/admin-level-lookup.use-case';
import { PrismaAdminRepository } from './infrastructure/out/prisma/admin.prisma.repository';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    {
      provide: AdminUseCasePort,
      useExisting: AdminService,
    },
    {
      provide: AdminRepositoryPort,
      useClass: PrismaAdminRepository,
    },
    {
      provide: AdminLevelLookupUseCase,
      useClass: AdminLevelLookupService,
    },
  ],
  exports: [AdminLevelLookupUseCase],
})
export class AdminModule {}
