import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BannersModule } from './banners/banners.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { MemberModule } from './member/member.module';
import { NotificationModule } from './notification/notification.module';
import { ReservationModule } from './reservation/reservation.module';
import { VerificationModule } from './verification/verification.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UploadS3Controller } from './upload-s3/upload-s3.controller';
import { UploadS3Service } from './upload-s3/upload-s3.service';
import { SessionModule } from './session/session.module';
import { BullModule } from '@nestjs/bull';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { AuthModule } from './auth/auth.module';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { VerifiedTokenGuard } from './guards/verified-token.guard';
import { ClubModule } from './club/club.module';
import { AdminModule } from './admin/admin.module';
import { NoticeModule } from './notice/notice.module';
import { InstrumentModule } from './instrument/instrument.module';
import { CacheModule } from '@nestjs/cache-manager';
import { FirebaseModule } from './firebase/firebase.module';
import * as redisStore from 'cache-manager-redis-store';
import { FirebaseService } from './firebase/firebase.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        username: configService.get('REDIS_USERNAME'),
        password: configService.get('REDIS_PASSWORD'),
        ttl: 300,
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          username: configService.get('REDIS_USERNAME'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60,
      limit: 20,
    }]),
    EventEmitterModule.forRoot({
      global: true
    }),
    BannersModule,
    MemberModule,
    NotificationModule,
    ReservationModule,
    VerificationModule,
    SessionModule,
    AuthModule,
    ClubModule,
    AdminModule,
    NoticeModule,
    InstrumentModule,
    FirebaseModule
  ],
  controllers: [AppController, UploadS3Controller, AuthController],
  providers: [AppService, UploadS3Service, AuthGuard, VerifiedTokenGuard, WsAuthGuard, FirebaseService],
  exports: [FirebaseService]
})
export class AppModule { }
