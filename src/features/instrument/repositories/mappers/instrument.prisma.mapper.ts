import { Instrument, Prisma, Session, Member } from '@prisma/client';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import {
  createInstrument,
  createInstrumentClub,
  type Instrument as InstrumentModel,
} from '../../models/instrument.model';

interface PrismaExternalBorrowHistoryItem {
  session: Pick<Session, 'date'> &
    Partial<Pick<Session, 'externalCreatorName'>>;
}

interface PrismaInternalBorrowHistoryItem {
  session: Pick<Session, 'date'> & { creator: Partial<Member> };
}

export type PrismaBorrowHistoryItem =
  | PrismaExternalBorrowHistoryItem
  | PrismaInternalBorrowHistoryItem;

function isMemberSession(
  item: PrismaBorrowHistoryItem,
): item is PrismaInternalBorrowHistoryItem {
  return 'creator' in item.session;
}

export class InstrumentRepositoryMapper {
  static toModel(
    prisma: Instrument & {
      club: { clubId: number; clubName: string };
      borrowHistory?: PrismaBorrowHistoryItem[];
    },
  ): InstrumentModel {
    return createInstrument({
      instrumentId: prisma.instrumentId,
      name: prisma.name,
      instrumentType: prisma.instrumentType,
      imageUrl: prisma.imageUrl,
      borrowAvailable: prisma.borrowAvailable,
      club: createInstrumentClub({
        clubId: prisma.club.clubId,
        clubName: prisma.club.clubName,
      }),
      borrowHistory:
        prisma.borrowHistory?.map((bh) => {
          if (isMemberSession(bh)) {
            return {
              borrowerName: bh.session.creator?.name ?? '알 수 없음',
              borrowerNickname: bh.session.creator?.nickname ?? undefined,
              borrowDate: AppKstDateTime.kstCalendarYmdFromDbOrString(
                bh.session.date,
              ),
            };
          }
          return {
            borrowerName: bh.session.externalCreatorName ?? '알 수 없음',
            borrowerNickname: undefined,
            borrowDate: AppKstDateTime.kstCalendarYmdFromDbOrString(
              bh.session.date,
            ),
          };
        }) ?? [],
    });
  }

  static toCreateInput(
    instrument: InstrumentModel,
  ): Prisma.InstrumentCreateInput {
    return {
      name: instrument.name,
      instrumentType: instrument.instrumentType,
      imageUrl: instrument.imageUrl,
      borrowAvailable: instrument.borrowAvailable,
      club: { connect: { clubId: instrument.club.clubId } },
    };
  }

  static toUpdateInput(
    instrument: InstrumentModel,
  ): Prisma.InstrumentUpdateInput {
    return {
      name: instrument.name,
      instrumentType: instrument.instrumentType,
      imageUrl: instrument.imageUrl,
      borrowAvailable: instrument.borrowAvailable,
    };
  }
}
