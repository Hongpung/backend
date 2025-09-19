import { Module } from '@nestjs/common';
import { EventModule } from 'src/infrastructure/events/event.module';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { MemberModule } from 'src/features/member/member.module';
import { InstrumentController } from './controllers/instrument.controller';
import { InstrumentRepository } from './repositories/instrument.repository';
import { InstrumentRepositoryPort } from './repositories/instrument.repository.port';
import { InstrumentService } from './services/instrument.service';

@Module({
  imports: [PrismaModule, EventModule, MemberModule],
  controllers: [InstrumentController],
  providers: [
    InstrumentService,
    {
      provide: InstrumentRepositoryPort,
      useClass: InstrumentRepository,
    },
  ],
  exports: [InstrumentRepositoryPort],
})
export class InstrumentModule {}
