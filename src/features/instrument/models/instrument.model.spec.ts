import { describe, expect, it } from '@jest/globals';
import {
  canBeBorrowedBy,
  createInstrument,
  createInstrumentClub,
} from './instrument.model';

describe('Instrument model', () => {
  const club = createInstrumentClub({
    clubId: 10,
    clubName: '테스트동아리',
  });

  function makeInstrument(overrides?: {
    borrowAvailable?: boolean;
    club?: ReturnType<typeof createInstrumentClub>;
  }) {
    return createInstrument({
      instrumentId: 1,
      instrumentType: 'KWANGGWARI',
      club: overrides?.club ?? club,
      name: '악기',
      imageUrl: null,
      borrowAvailable: overrides?.borrowAvailable ?? true,
    });
  }

  it('clubId가 null이면 canBeBorrowedBy는 false이다', () => {
    expect(canBeBorrowedBy(makeInstrument(), null)).toBe(false);
  });

  it('같은 동아리 clubId면 canBeBorrowedBy는 false이다', () => {
    expect(canBeBorrowedBy(makeInstrument(), 10)).toBe(false);
  });

  it('다른 동아리이고 대여 가능하면 canBeBorrowedBy는 true이다', () => {
    expect(canBeBorrowedBy(makeInstrument({ borrowAvailable: true }), 99)).toBe(
      true,
    );
  });

  it('다른 동아리여도 대여 불가면 canBeBorrowedBy는 false이다', () => {
    expect(
      canBeBorrowedBy(makeInstrument({ borrowAvailable: false }), 99),
    ).toBe(false);
  });
});
