import { describe, expect, it } from '@jest/globals';
import type { EnInstrumentType, KoInstrumentType } from './instrument.model';
import { InstrumentEnum } from './instrument-enum';

describe('InstrumentEnum', () => {
  it('EnToKo는 영문 타입을 한글로 변환한다', () => {
    expect(InstrumentEnum.EnToKo('KWANGGWARI')).toBe('꽹과리');
    expect(InstrumentEnum.EnToKo('JING')).toBe('징');
    expect(InstrumentEnum.EnToKo('JANGGU')).toBe('장구');
    expect(InstrumentEnum.EnToKo('BUK')).toBe('북');
    expect(InstrumentEnum.EnToKo('SOGO')).toBe('소고');
    expect(InstrumentEnum.EnToKo('ELSE')).toBe('기타');
  });

  it('KoToEn는 한글 타입을 영문으로 변환한다', () => {
    expect(InstrumentEnum.KoToEn('꽹과리')).toBe('KWANGGWARI');
    expect(InstrumentEnum.KoToEn('징')).toBe('JING');
    expect(InstrumentEnum.KoToEn('장구')).toBe('JANGGU');
    expect(InstrumentEnum.KoToEn('북')).toBe('BUK');
    expect(InstrumentEnum.KoToEn('소고')).toBe('SOGO');
    expect(InstrumentEnum.KoToEn('기타')).toBe('ELSE');
  });

  it('EnToKo와 KoToEn은 round-trip이 된다', () => {
    const enTypes: EnInstrumentType[] = [
      'KWANGGWARI',
      'JING',
      'JANGGU',
      'BUK',
      'SOGO',
      'ELSE',
    ];
    for (const en of enTypes) {
      const ko = InstrumentEnum.EnToKo(en);
      expect(InstrumentEnum.KoToEn(ko)).toBe(en);
    }

    const koTypes: KoInstrumentType[] = [
      '꽹과리',
      '징',
      '장구',
      '북',
      '소고',
      '기타',
    ];
    for (const ko of koTypes) {
      const en = InstrumentEnum.KoToEn(ko);
      expect(InstrumentEnum.EnToKo(en)).toBe(ko);
    }
  });
});
