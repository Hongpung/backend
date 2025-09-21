import { Module } from '@nestjs/common';
import { DiscardedReservationQueryUseCase } from './application/services/discarded-reservation-query.use-case';
import { DiscardedReservationQueryUseCasePort } from './application/ports/in/discarded-reservation-query.use-case.port';
import { PrismaDiscardedReservationRepository } from './infrastructure/out/prisma/discarded-reservation.prisma.repository';
import { DiscardedReservationEventHandler } from './infrastructure/in/event-handlers/discarded-reservation.event-handler';
import { DiscardedReservationAdminController } from './infrastructure/in/controllers/discarded-reservation-admin.controller';
import { ResponseValidationInterceptor } from 'src/common/validation/response-validation.interceptor';
import { DiscardedReservationRepositoryPort } from './application/ports/out/discarded-reservation.repository.port';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DiscardedReservationAdminController],
  providers: [
    DiscardedReservationQueryUseCase,
    {
      provide: DiscardedReservationQueryUseCasePort,
      useExisting: DiscardedReservationQueryUseCase,
    },
    DiscardedReservationEventHandler,
    ResponseValidationInterceptor,
    {
      provide: DiscardedReservationRepositoryPort,
      useClass: PrismaDiscardedReservationRepository,
    },
  ],
  exports: [
    DiscardedReservationQueryUseCasePort,
    DiscardedReservationRepositoryPort,
  ],
})
export class DiscardedReservationModule {}
