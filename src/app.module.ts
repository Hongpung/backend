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
import { FirebaseModule } from './firebase/firebase.module';
import { RedisModule } from './redis/redis.module';
import { FirebaseService } from './firebase/firebase.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VersionModule } from './version/version.module';
import { MetricsModule } from './metrics/metrics.module';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './common/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    RedisModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: Number(configService.get('REDIS_PORT')),
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
    FirebaseModule,
    VersionModule,
    MetricsModule,
  ],
  controllers: [AppController, UploadS3Controller, AuthController],
  providers: [
    AppService,
    UploadS3Service,
    AuthGuard,
    VerifiedTokenGuard,
    WsAuthGuard,
    FirebaseService,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
  exports: [FirebaseService],
})
export class AppModule { }
