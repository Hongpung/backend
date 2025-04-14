import { Module } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationNotificationService } from './reservation-notification.service';
import { BullModule } from '@nestjs/bull';
import { ReservationProcessor } from './reservation.processor';
import { NotificationModule } from 'src/notification/notification.module';
import { PrismaService } from 'src/prisma.service';
import { ReservationController } from './reservation.controller';
import { ReservationSchedulerService } from './reservation-scheduler.service';
import { SessionModule } from 'src/session/session.module';
import { AdminReservationController } from './admin-reservation.controller';
import { AdminReservationService } from './admin-reservation.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { RoleEnum } from 'src/role/role.enum';
import { InstrumentEnum } from 'src/instrument/instrument.enum';
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'reservation',
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    NotificationModule,
    SessionModule
  ],
  providers: [
    ReservationService,
    ReservationSchedulerService,
    ReservationNotificationService,
    ReservationProcessor,
    AdminReservationService,
    PrismaService,
    FirebaseService,
    RoleEnum,
    InstrumentEnum
  ],
  controllers: [
    ReservationController,
    AdminReservationController
  ]
})
export class ReservationModule { }
