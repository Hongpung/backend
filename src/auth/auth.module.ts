import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { RoleEnum } from 'src/role/role.enum';
import { MailModule } from 'src/mail/mail.module';
import { MemberService } from 'src/member/member.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.SECRET_KEY,
    }),
    MailModule
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, RoleEnum, MemberService],
  exports: [AuthService]
})
export class AuthModule { }
