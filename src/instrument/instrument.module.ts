import { Module } from '@nestjs/common';
import { InstrumentService } from './instrument.service';
import { InstrumentController } from './instrument.controller';
import { PrismaService } from 'src/prisma.service';
import { InstrumentEnum } from './instrument.enum';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports:[NotificationModule],
  controllers: [InstrumentController],
  providers: [InstrumentService, PrismaService, InstrumentEnum],
})
export class InstrumentModule { }
