import { Module } from '@nestjs/common';
import { ClubService } from './club.service';
import { ClubController } from './club.controller';
import { PrismaService } from 'src/prisma.service';
import { InstrumentType } from 'src/instrument/instrument.service';
import { RoleEnum } from 'src/role/role.enum';

@Module({
  controllers: [ClubController],
  providers: [ClubService, PrismaService, InstrumentType, RoleEnum],
})
export class ClubModule { }
