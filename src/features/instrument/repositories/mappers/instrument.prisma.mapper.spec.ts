import { describe, expect, it } from '@jest/globals';
import { Instrument } from '@prisma/client';
import {
  createInstrument,
  createInstrumentClub,
} from '../../models/instrument.model';
import {
  InstrumentRepositoryMapper,
  type PrismaBorrowHistoryItem,
} from './instrument.prisma.mapper';

type MockPrismaInstrument = Instrument & {
  club: { clubId: number; clubName: string };
  borrowHistory?: PrismaBorrowHistoryItem[];
};

describe('InstrumentRepositoryMapper', () => {
  const basePrismaRow: MockPrismaInstrument = {
    instrumentId: 1,
    name: '북',
    instrumentType: 'BUK' as const,
    imageUrl: null as string | null,
    borrowAvailable: true,
    clubId: 3,
    club: { clubId: 3, clubName: '동아리' },
    borrowHistory: [],
  };

  it('toModel은 기본 필드와 동아리를 채운다', () => {
    const model = InstrumentRepositoryMapper.toModel(basePrismaRow);
    expect(model.instrumentId).toBe(1);
    expect(model.name).toBe('북');
    expect(model.instrumentType).toBe('BUK');
    expect(model.imageUrl).toBeNull();
    expect(model.borrowAvailable).toBe(true);
    expect(model.club.clubId).toBe(3);
    expect(model.club.clubName).toBe('동아리');
    expect(model.borrowHistory).toEqual([]);
  });

  it('borrowHistory에서 creator.name을 우선한다', () => {
    const testData = {
      ...basePrismaRow,
      borrowHistory: [
        {
          session: {
            date: new Date('2026-04-15T12:00:00.000Z'),
            externalCreatorName: '외부',
            creator: { name: '내부', nickname: '닉' },
          },
        },
      ],
    };
    const model = InstrumentRepositoryMapper.toModel(testData);
    expect(model.borrowHistory[0]).toEqual({
      borrowerName: '내부',
      borrowerNickname: '닉',
      borrowDate: '2026-04-15',
    });
  });

  it('creator가 없으면 externalCreatorName을 쓴다', () => {
    const testData = {
      ...basePrismaRow,
      borrowHistory: [
        {
          session: {
            date: new Date('2026-01-02T00:00:00.000Z'),
            externalCreatorName: '외부이름',
            creator: null,
          },
        },
      ],
    };
    const model = InstrumentRepositoryMapper.toModel(testData);
    expect(model.borrowHistory[0].borrowerName).toBe('알 수 없음');
    expect(model.borrowHistory[0].borrowerNickname).toBeUndefined();
    expect(model.borrowHistory[0].borrowDate).toBe('2026-01-02');
  });

  it('creator와 externalCreatorName이 모두 없으면 알 수 없음이다', () => {
    const model = InstrumentRepositoryMapper.toModel({
      ...basePrismaRow,
      borrowHistory: [
        {
          session: {
            date: new Date('2026-03-01T00:00:00.000Z'),
            externalCreatorName: null,
            creator: null,
          },
        },
      ],
    });
    expect(model.borrowHistory[0].borrowerName).toBe('알 수 없음');
  });

  it('nickname이 null이면 borrowerNickname은 생략된다', () => {
    const model = InstrumentRepositoryMapper.toModel({
      ...basePrismaRow,
      borrowHistory: [
        {
          session: {
            date: new Date('2026-05-01T00:00:00.000Z'),
            externalCreatorName: null,
            creator: { name: '이름만', nickname: null },
          },
        },
      ],
    });
    expect(model.borrowHistory[0].borrowerNickname).toBeUndefined();
  });

  it('toCreateInput은 club 연결과 필드를 반환한다', () => {
    const instrument = createInstrument({
      instrumentId: 0,
      name: '소고',
      instrumentType: 'SOGO',
      imageUrl: 'https://x',
      borrowAvailable: true,
      club: createInstrumentClub({ clubId: 9, clubName: 'c' }),
    });
    expect(InstrumentRepositoryMapper.toCreateInput(instrument)).toEqual({
      name: '소고',
      instrumentType: 'SOGO',
      imageUrl: 'https://x',
      borrowAvailable: true,
      club: { connect: { clubId: 9 } },
    });
  });

  it('toUpdateInput은 스칼라 필드만 반환한다', () => {
    const instrument = createInstrument({
      instrumentId: 3,
      name: '징',
      instrumentType: 'JING',
      imageUrl: null,
      borrowAvailable: false,
      club: createInstrumentClub({ clubId: 1, clubName: 'x' }),
    });
    expect(InstrumentRepositoryMapper.toUpdateInput(instrument)).toEqual({
      name: '징',
      instrumentType: 'JING',
      imageUrl: null,
      borrowAvailable: false,
    });
  });
});
