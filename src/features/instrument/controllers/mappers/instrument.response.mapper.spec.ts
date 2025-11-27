import { describe, expect, it } from '@jest/globals';
import {
  createInstrument,
  createInstrumentClub,
  type Instrument,
} from '../../models/instrument.model';
import { InstrumentResponseMapper } from './instrument.response.mapper';

describe('InstrumentResponseMapper', () => {
  function baseInstrument(
    overrides?: Partial<{
      borrowHistory: Instrument['borrowHistory'];
      instrumentType: Instrument['instrumentType'];
    }>,
  ): Instrument {
    return createInstrument({
      instrumentId: 7,
      name: '북 1번',
      instrumentType: overrides?.instrumentType ?? 'BUK',
      imageUrl: 'https://example.com/b.jpg',
      borrowAvailable: false,
      club: createInstrumentClub({
        clubId: 2,
        clubName: '풍물패',
      }),
      borrowHistory: overrides?.borrowHistory ?? [],
    });
  }

  it('toInstrumentResDto는 필드를 매핑하고 타입을 한국어로 바꾼다', () => {
    const instrument = baseInstrument();
    expect(InstrumentResponseMapper.toInstrumentResDto(instrument)).toEqual({
      instrumentId: 7,
      name: '북 1번',
      instrumentType: '북',
      imageUrl: 'https://example.com/b.jpg',
      borrowAvailable: false,
      club: '풍물패',
    });
  });

  it('toInstrumentDetailResDto는 club를 문자열로 두고 borrowHistory를 그대로 둔다', () => {
    const history = [
      {
        borrowerName: '홍길동',
        borrowerNickname: '길동',
        borrowDate: '2026-04-01',
      },
    ];
    const instrument = baseInstrument({ borrowHistory: history });

    expect(
      InstrumentResponseMapper.toInstrumentDetailResDto(instrument),
    ).toEqual({
      instrumentId: 7,
      imageUrl: 'https://example.com/b.jpg',
      name: '북 1번',
      instrumentType: '북',
      club: '풍물패',
      borrowAvailable: false,
      borrowHistory: history,
    });
  });

  it('toCreateInstrumentResDto는 기본 메시지를 포함한다', () => {
    const dto =
      InstrumentResponseMapper.toCreateInstrumentResDto(baseInstrument());
    expect(dto.message).toBe('악기 생성이 완료되었습니다.');
    expect(dto.instrumentType).toBe('북');
  });

  it('toCreateInstrumentResDto는 커스텀 메시지를 받을 수 있다', () => {
    const dto = InstrumentResponseMapper.toCreateInstrumentResDto(
      baseInstrument(),
      '생성 완료',
    );
    expect(dto.message).toBe('생성 완료');
  });

  it('toUpdateInstrumentResDto는 기본 메시지를 포함한다', () => {
    const dto =
      InstrumentResponseMapper.toUpdateInstrumentResDto(baseInstrument());
    expect(dto.message).toBe('악기 수정이 완료되었습니다.');
  });

  it('toDeleteInstrumentResDto는 메시지만 반환한다', () => {
    expect(InstrumentResponseMapper.toDeleteInstrumentResDto()).toEqual({
      message: '악기 삭제가 완료되었습니다.',
    });
    expect(InstrumentResponseMapper.toDeleteInstrumentResDto('삭제됨')).toEqual(
      {
        message: '삭제됨',
      },
    );
  });
});
