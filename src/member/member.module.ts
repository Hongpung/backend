import { Module } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { PrismaService } from 'src/prisma.service';
import { RoleEnum } from 'src/role/role.enum';

@Module({
  controllers: [MemberController],
  providers: [MemberService, PrismaService, RoleEnum],
  exports:[MemberService]
})
export class MemberModule {}
