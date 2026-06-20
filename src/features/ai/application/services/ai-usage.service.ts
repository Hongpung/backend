import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { AI_AVAILABLE_COMMANDS } from '../../domain/available-commands';
import type { AiUsageSnapshot } from '../../domain/ai.types';
import { AiStorePort, type AiStorePort as IAiStorePort } from '../ports/out/ai.ports';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class AiUsageService {
  constructor(
    @Inject(AiStorePort)
    private readonly aiStore: IAiStorePort,
    private readonly configService: ConfigService,
  ) {}

  async checkUsage(adminId: string): Promise<AiUsageSnapshot> {
    const rawLimit = this.configService.get<string | number>(
      'AI_USAGE_MONTHLY_LIMIT',
      500,
    );
    const limit = Number(rawLimit);
    const monthlyLimit = Number.isFinite(limit) ? limit : 500;
    const monthStart = this.currentMonthStartKst();
    const resetAt = this.nextMonthStartKst();
    const used = await this.aiStore.countUsageEligibleUserTurns(
      adminId,
      monthStart,
    );

    return {
      allowed: used < monthlyLimit,
      used,
      limit: monthlyLimit,
      period: 'month',
      resetAt: resetAt.toISOString(),
    };
  }

  private currentMonthStartKst(now: Date = new Date()): Date {
    return dayjs(now)
      .tz(AppKstDateTime.KST_TIMEZONE)
      .startOf('month')
      .toDate();
  }

  private nextMonthStartKst(now: Date = new Date()): Date {
    return dayjs(now)
      .tz(AppKstDateTime.KST_TIMEZONE)
      .add(1, 'month')
      .startOf('month')
      .toDate();
  }
}
