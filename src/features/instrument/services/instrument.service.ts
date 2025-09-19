import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import { EventBus } from 'src/infrastructure/events/event.provider';
import {
  MemberAuthorizationPort,
  type MemberAuthorizationPort as IMemberAuthorizationPort,
} from 'src/features/member/application/ports/out/member-authorization.port';
import type {
  CreateInstrumentParams,
  UpdateInstrumentParams,
} from '../models/instrument.commands';
import {
  createInstrument,
  createInstrumentClub,
  type Instrument,
} from '../models/instrument.model';
import {
  InstrumentRepositoryPort,
  type IInstrumentRepository,
} from '../repositories/instrument.repository.port';

@Injectable()
export class InstrumentService {
  private readonly logger = new Logger(InstrumentService.name);

  constructor(
    @Inject(InstrumentRepositoryPort)
    private readonly repository: IInstrumentRepository,
    @Inject(MemberAuthorizationPort)
    private readonly memberAuthPort: IMemberAuthorizationPort,
    private readonly eventBus: EventBus,
  ) {}

  private async assertInstrumentManagementContext(memberId: number) {
    const ctx =
      await this.memberAuthPort.getInstrumentManagementContext(memberId);
    if (!ctx) {
      throw new ForbiddenException('사용자를 찾을 수 없거나 권한이 없습니다.');
    }
    return ctx;
  }

  private assertClubOwnership(
    instrumentClubId: number,
    ctxClubId: number,
  ): void {
    if (instrumentClubId !== ctxClubId) {
      throw new ForbiddenException('해당 악기의 소유 동아리가 아닙니다.');
    }
  }

  async findBorrowableList(
    clubId: number | null,
    page?: number,
    pageSize?: number,
  ): Promise<Instrument[]> {
    this.logger.log(
      `Finding borrowable instruments for club ${clubId} with page: ${page}, pageSize: ${pageSize}.`,
    );
    const instruments = await this.repository.findBorrowableInstruments(
      clubId,
      page,
      pageSize,
    );
    this.logger.log(`Found ${instruments.length} borrowable instruments.`);
    return instruments;
  }

  async findDetail(instrumentId: number): Promise<Instrument | null> {
    this.logger.log(`Finding detail for instrument ${instrumentId}.`);
    const instrument = await this.repository.findDetail(instrumentId);
    if (instrument) {
      this.logger.log(`Found instrument ${instrumentId}.`);
    } else {
      this.logger.warn(`Instrument ${instrumentId} not found.`);
    }
    return instrument;
  }

  async create(
    memberId: number,
    params: CreateInstrumentParams,
  ): Promise<Instrument> {
    this.logger.log(
      `Creating instrument for member ${memberId} with params: ${JSON.stringify(
        params,
      )}`,
    );
    const ctx = await this.assertInstrumentManagementContext(memberId);

    const instrument = createInstrument({
      instrumentId: 0,
      name: params.name,
      instrumentType: params.instrumentType,
      imageUrl: params.imageUrl ?? null,
      borrowAvailable: true,
      club: createInstrumentClub({
        clubId: ctx.clubId,
        clubName: ctx.clubName,
      }),
    });

    const created = await this.repository.create(instrument);
    this.logger.log(`Instrument ${created.instrumentId} created successfully.`);
    return created;
  }

  async update(
    memberId: number,
    instrumentId: number,
    params: UpdateInstrumentParams,
  ): Promise<Instrument> {
    this.logger.log(
      `Updating instrument ${instrumentId} for member ${memberId} with params: ${JSON.stringify(
        params,
      )}`,
    );
    const ctx = await this.assertInstrumentManagementContext(memberId);

    const existing = await this.repository.findDetail(instrumentId);
    if (!existing) {
      throw new NotFoundException('악기를 찾을 수 없습니다.');
    }
    this.assertClubOwnership(existing.club.clubId, ctx.clubId);

    const updatedInstrument = createInstrument({
      instrumentId: existing.instrumentId,
      name: params.name ?? existing.name,
      instrumentType: params.instrumentType ?? existing.instrumentType,
      imageUrl:
        params.imageUrl !== undefined ? params.imageUrl : existing.imageUrl,
      borrowAvailable: params.borrowAvailable ?? existing.borrowAvailable,
      club: existing.club,
      borrowHistory: existing.borrowHistory,
    });

    const updated = await this.repository.update(
      instrumentId,
      updatedInstrument,
    );
    this.logger.log(`Instrument ${instrumentId} updated successfully.`);
    return updated;
  }

  async remove(memberId: number, instrumentId: number): Promise<void> {
    this.logger.log(
      `Removing instrument ${instrumentId} for member ${memberId}.`,
    );
    const ctx = await this.assertInstrumentManagementContext(memberId);

    const existing = await this.repository.findDetail(instrumentId);
    if (!existing) {
      throw new NotFoundException('악기를 찾을 수 없습니다.');
    }
    this.assertClubOwnership(existing.club.clubId, ctx.clubId);

    this.eventBus.emitTyped(EVENT_TOKEN.EDIT_INSTRUMENT, { instrumentId });
    await this.repository.delete(instrumentId, ctx.clubId);
    this.logger.log(`Instrument ${instrumentId} removed successfully.`);
  }
}
