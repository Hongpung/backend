import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BannerModule } from './features/banner/banner.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { MemberModule } from './member/member.module';
import { NotificationModule } from './notification/notification.module';
import { ReservationModule } from './reservation/reservation.module';
import { VerificationModule } from './verification/verification.module';
import { EventModule } from './infrastructure/events/event.module';
import { RpcModule } from './infrastructure/rpc/rpc.module';
import { UploadModule } from './features/upload/upload.module';
import { SessionModule } from './session/session.module';
import { BullModule } from '@nestjs/bullmq';
import { SecurityModule } from './security/security.module';
import { AuthModule } from './auth/auth.module';
import { ClubModule } from './features/club/club.module';
import { AdminModule } from './admin/admin.module';
import { NoticeModule } from './features/notice/notice.module';
import { InstrumentModule } from './instrument/instrument.module';
import { FirebaseModule } from './infrastructure/firebase/firebase.module';
import { RedisModule } from '@hongpung/redis';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VersionModule } from './version/version.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { MetricsModule } from './infrastructure/metrics/metrics.module';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './infrastructure/logging/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        // 요청/응답 자동 로그는 끄고, LoggingInterceptor에서 구조화 로그로 일원화
        autoLogging: false,
        // 요청별 ID: X-Request-ID 수신 시 재사용, 없으면 UUID (OTel traceId 확장 대비)
        genReqId: (req: Request, _res: unknown) => {
          const raw = (req as Request).headers['x-request-id'];
          return (typeof raw === 'string' ? raw : undefined) ?? uuidv4();
        },
        // 로그에 traceId 필드 추가 (로그-트레이스 상관관계용)
        customProps: (req: Request) => ({
          traceId: (req as Request & { id?: string }).id,
        }),
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
    ThrottlerModule.forRoot([{
      ttl: 60,
      limit: 20,
    }]),
    EventModule,
    RpcModule,
    BannerModule,
    MemberModule,
    NotificationModule,
    ReservationModule,
    VerificationModule,
    SessionModule,
    AuthModule,
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
export class AppModule { }
