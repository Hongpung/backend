import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BannerModule } from './features/banner/banner.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { MemberModule } from './features/member/member.module';
import { PushNotificationModule } from './features/push-notification/push-notification.module';
import { ReservationModule } from './features/reservation/reservation.module';
import { UploadModule } from './features/upload/upload.module';
import { SessionLogModule } from './features/session-log/session-log.module';
// Session: 레거시 src/session 트리는 제거됨. 유일한 런타임 모듈은 아래 features/session.
import { SessionModule } from './features/session/session.module';
import { BullModule } from '@nestjs/bullmq';
import { AdminAuthModule } from './features/admin-auth/admin-auth.module';
import { MemberAuthModule } from './features/member-auth/member-auth.module';
import { SecurityModule } from './security/security.module';
import { ClubModule } from './features/club/club.module';
import { AdminModule } from './features/admin/admin.module';
import { NoticeModule } from './features/notice/notice.module';
import { InstrumentModule } from './features/instrument/instrument.module';
import { RedisModule } from '@hongpung/redis';
import { FirebaseModule } from './infrastructure/firebase/firebase.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VersionModule } from './version/version.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { EventModule } from './infrastructure/events/event.module';
import { RpcModule } from './infrastructure/rpc/rpc.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './infrastructure/logging/logging.interceptor';
import { MetricsModule } from './infrastructure/metrics/metrics.module';
import { LiveSessionNotificationModule } from './features/live-session-notification/live-session-notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        autoLogging: false,
        genReqId: (req: any) => {
          const raw = req.headers['x-request-id'];
          return (typeof raw === 'string' ? raw : undefined) ?? uuidv4();
        },
        customProps: (req: any) => ({
          traceId: req.id,
        }),
        // 로컬·스테이징: JSON 한 줄 대신 Nest 기본에 가까운 읽기 쉬운 로그
        ...(process.env.NODE_ENV !== 'production'
          ? {
              transport: {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'HH:MM:ss.l',
                  singleLine: true,
                  ignore: 'pid,hostname',
                },
              },
            }
          : {}),
      },
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          username: configService.get('REDIS_USERNAME'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 20,
      },
    ]),
    EventModule,
    RpcModule,
    BannerModule,
    MemberModule,
    PushNotificationModule,
    LiveSessionNotificationModule,
    SessionModule,
    ReservationModule,
    SessionLogModule,
    AdminAuthModule,
    MemberAuthModule,
    SecurityModule,
    ClubModule,
    AdminModule,
    NoticeModule,
    InstrumentModule,
    FirebaseModule,
    VersionModule,
    MetricsModule,
    PrismaModule,
    MailModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
