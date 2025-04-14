import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { PrismaService } from 'src/prisma.service';
import { MailService } from 'src/mail/mail.service';

@Module({
  imports: [
    JwtModule.register({
      global: false,
      secret: process.env.VERIFIED_SECRET_KEY,
      signOptions: { expiresIn: '5m' },
    }),
  ],
  controllers: [VerificationController],
  providers: [VerificationService, MailService, PrismaService],
})
export class VerificationModule { }
