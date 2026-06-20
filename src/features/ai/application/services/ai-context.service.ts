import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationRepositoryPort } from 'src/features/reservation/application/ports/out/reservation.repository.port';
import type { ReservationRepository } from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { AI_AVAILABLE_COMMANDS } from '../../domain/available-commands';
import type { AiContextSnapshot } from '../../domain/ai.types';
import { AiStorePort, type AiStorePort as IAiStorePort } from '../ports/out/ai.ports';
import { toCompleteTurnMessages } from '../utils/ai-turn-context.util';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class AiContextService {
  constructor(
    @Inject(AiStorePort)
    private readonly aiStore: IAiStorePort,
    @Inject(ReservationRepositoryPort)
    private readonly reservationRepository: ReservationRepository,
    private readonly configService: ConfigService,
  ) {}

  async buildContext(
    adminId: string,
    roomId: string,
    limit?: number,
  ): Promise<AiContextSnapshot> {
    const rawTurnLimit = this.configService.get<string | number>(
      'AI_CONTEXT_TURN_LIMIT',
      20,
    );
    const defaultTurnLimit = Number(rawTurnLimit);
    const turnLimit = limit ?? (Number.isFinite(defaultTurnLimit) ? defaultTurnLimit : 20);
    const reservationDays =
      Number(
        this.configService.get<string | number>('AI_CONTEXT_RESERVATION_DAYS', 30),
      ) || 30;

    const turns = await this.aiStore.findRecentTurns(adminId, roomId, turnLimit);
    const messages = toCompleteTurnMessages(turns);

    const startDate = dayjs().tz(AppKstDateTime.KST_TIMEZONE).startOf('day').toDate();
    const endDate = dayjs(startDate)
      .tz(AppKstDateTime.KST_TIMEZONE)
      .add(reservationDays, 'day')
      .endOf('day')
      .toDate();

    const reservations = await this.reservationRepository.findReservationsByTerm(
      startDate,
      endDate,
    );

    return {
      messages,
      domainSnapshot: {
        reservations: reservations
          .filter((reservation) => reservation.reservationId != null)
          .slice(0, 50)
          .map((reservation) => ({
            id: String(reservation.reservationId),
            status: reservation.reservationType,
            date: AppKstDateTime.kstCalendarYmdFromDbOrString(reservation.date),
            spaceName: reservation.title,
          })),
        availableCommands: AI_AVAILABLE_COMMANDS,
      },
    };
  }
}
